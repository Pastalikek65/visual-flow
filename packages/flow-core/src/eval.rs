use crate::compile::{build_plan, Plan};
use crate::graph::{GraphState, WireGraph, WirePatch};
use crate::incremental::dirty_closure;
use crate::nodes::Registry;
use crate::value::{NodeCtx, Value};
use std::collections::{BTreeMap, BTreeSet};

pub struct Engine {
    graph: GraphState,
    plan: Plan,
    registry: Registry,
    values: BTreeMap<String, Value>,
    versions: BTreeMap<String, u64>,
    dirty: BTreeSet<String>,
    generation: u64,
}

impl Engine {
    pub fn new() -> Self {
        Engine {
            graph: GraphState::default(),
            plan: Plan { order: Vec::new() },
            registry: Registry::builtin(),
            values: BTreeMap::new(),
            versions: BTreeMap::new(),
            dirty: BTreeSet::new(),
            generation: 0,
        }
    }

    pub fn set_graph(&mut self, json: &str) -> Result<(), String> {
        let wire: WireGraph = serde_json::from_str(json).map_err(|e| e.to_string())?;
        self.graph = GraphState::from(wire);
        self.generation += 1;
        self.plan = build_plan(&self.graph)?;
        self.dirty = self.graph.nodes.keys().cloned().collect();
        self.versions = self
            .graph
            .nodes
            .keys()
            .map(|id| (id.clone(), self.generation))
            .collect();
        self.values.clear();
        Ok(())
    }

    pub fn patch_graph(&mut self, json: &str) -> Result<Vec<String>, String> {
        let patch: WirePatch = serde_json::from_str(json).map_err(|e| e.to_string())?;
        let backup = self.graph.clone();

        let mut seeds = BTreeSet::new();
        for id in &patch.nodes_removed {
            if self.graph.nodes.remove(id).is_some() {
                seeds.insert(id.clone());
            }
        }
        for eid in &patch.edges_removed {
            if let Some(edge) = self.graph.edges.remove(eid) {
                seeds.insert(edge.to);
            }
        }
        for node in &patch.nodes_added {
            self.graph.nodes.insert(node.id.clone(), node.clone());
            seeds.insert(node.id.clone());
        }
        for node in &patch.nodes_changed {
            if self.graph.nodes.contains_key(&node.id) {
                self.graph.nodes.insert(node.id.clone(), node.clone());
                seeds.insert(node.id.clone());
            }
        }
        for edge in &patch.edges_added {
            if self.graph.nodes.contains_key(&edge.from)
                && self.graph.nodes.contains_key(&edge.to)
                && !self.graph.edges.contains_key(&edge.id)
            {
                self.graph.edges.insert(edge.id.clone(), edge.clone());
                seeds.insert(edge.to.clone());
            }
        }

        if let Err(err) = build_plan(&self.graph) {
            self.graph = backup;
            return Err(format!("patch rejected (cycle?): {err}"));
        }

        let dirty = dirty_closure(&self.graph, &seeds);
        self.dirty.extend(dirty.clone());
        self.generation += 1;
        for id in &self.dirty {
            self.versions.insert(id.clone(), self.generation);
        }
        self.versions
            .retain(|id, _| self.graph.nodes.contains_key(id));
        self.values
            .retain(|id, _| self.graph.nodes.contains_key(id));
        self.plan = build_plan(&self.graph)?;

        Ok(dirty.into_iter().collect())
    }

    pub fn run(&mut self) -> Result<serde_json::Value, String> {
        let mut results = serde_json::Map::new();
        for node in &self.plan.order {
            if !self.dirty.contains(&node.id) {
                continue;
            }
            let spec = self
                .registry
                .get(&node.kind)
                .ok_or_else(|| format!("unknown node kind: {}", node.kind))?;
            let mut inputs = Vec::with_capacity(spec.inputs().len());
            for port in spec.inputs() {
                match node.inbound.get(port.name) {
                    Some(src) => inputs.push(self.values.get(src).cloned().unwrap_or(Value::Null)),
                    None => inputs.push(Value::Null),
                }
            }
            let ctx = NodeCtx {
                inputs: &inputs,
                params: &node.params,
            };
            let value = spec.compute(&ctx);
            self.values.insert(node.id.clone(), value.clone());
            results.insert(node.id.clone(), value.to_json());
        }
        self.dirty.clear();
        Ok(serde_json::Value::Object(results))
    }

    pub fn query(&self, node_id: &str) -> Option<Value> {
        self.values.get(node_id).cloned()
    }

    pub fn can_connect(&self, from: &str, to: &str) -> bool {
        self.graph.can_connect(from, to)
    }

    pub fn graph_json(&self) -> String {
        let wire = WireGraph::from(&self.graph);
        serde_json::to_string(&wire).unwrap_or_default()
    }

    pub fn node_kinds(&self) -> Vec<(&'static str, &'static str)> {
        self.registry.kinds()
    }

    pub fn dirty_len(&self) -> usize {
        self.dirty.len()
    }
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn constant(id: &str, value: f64) -> String {
        format!(r#"{{"id":"{id}","kind":"constant","params":{{"value":{value}}}}}"#)
    }

    fn edge_json(id: &str, from: &str, to: &str, to_port: &str) -> String {
        format!(
            r#"{{"id":"{id}","from":"{from}","to":"{to}","from_port":"out","to_port":"{to_port}"}}"#
        )
    }

    fn patch(
        added_nodes: Vec<String>,
        changed_nodes: Vec<String>,
        added_edges: Vec<String>,
        removed_edges: Vec<String>,
    ) -> String {
        let nodes: String = added_nodes
            .into_iter()
            .chain(changed_nodes)
            .collect::<Vec<_>>()
            .join(",");
        let edges: String = added_edges.join(",");
        let removed: String = removed_edges
            .into_iter()
            .map(|e| format!("\"{e}\""))
            .collect::<Vec<_>>()
            .join(",");
        format!(
            r#"{{"nodes_added":[{nodes}],"edges_added":[{edges}],"edges_removed":[{removed}]}}"#
        )
    }

    #[test]
    fn two_constants_sum_to_three() {
        let mut engine = Engine::new();
        engine
            .set_graph(
                r#"{"nodes":[
                    {"id":"a","kind":"constant","params":{"value":1.0}},
                    {"id":"b","kind":"constant","params":{"value":2.0}},
                    {"id":"c","kind":"add","params":{}}
                ],"edges":[
                    {"id":"e1","from":"a","to":"c","from_port":"out","to_port":"a"},
                    {"id":"e2","from":"b","to":"c","from_port":"out","to_port":"b"}
                ]}"#,
            )
            .unwrap();
        let out = engine.run().unwrap();
        let c = out.get("c").unwrap();
        assert_eq!(c["value"], json!(3.0));
    }

    #[test]
    fn unbound_input_defaults_to_zero() {
        let mut engine = Engine::new();
        engine
            .set_graph(r#"{"nodes":[{"id":"a","kind":"add","params":{}}]}"#)
            .unwrap();
        let out = engine.run().unwrap();
        assert_eq!(out["a"]["value"], json!(0.0));
    }

    #[test]
    fn patch_recomputes_only_affected_subgraph() {
        let mut engine = Engine::new();
        engine
            .set_graph(
                r#"{"nodes":[
                    {"id":"a","kind":"constant","params":{"value":10.0}},
                    {"id":"b","kind":"constant","params":{"value":2.0}},
                    {"id":"c","kind":"add","params":{}},
                    {"id":"d","kind":"mul","params":{}}
                ],"edges":[
                    {"id":"e1","from":"a","to":"c","from_port":"out","to_port":"a"},
                    {"id":"e2","from":"b","to":"c","from_port":"out","to_port":"b"},
                    {"id":"e3","from":"c","to":"d","from_port":"out","to_port":"a"},
                    {"id":"e4","from":"a","to":"d","from_port":"out","to_port":"b"}
                ]}"#,
            )
            .unwrap();
        engine.run().unwrap();

        let dirty = engine
            .patch_graph(&patch(vec![], vec![constant("a", 5.0)], vec![], vec![]))
            .unwrap();
        assert!(dirty.contains(&"a".to_string()));
        assert!(dirty.contains(&"c".to_string()));
        assert!(dirty.contains(&"d".to_string()));
        assert!(!dirty.contains(&"b".to_string()));

        let out = engine.run().unwrap();
        assert_eq!(out["a"]["value"], json!(5.0));
        assert_eq!(out["c"]["value"], json!(7.0));
        assert_eq!(out["d"]["value"], json!(35.0));
        assert_eq!(out.as_object().unwrap().len(), 3);
    }

    #[test]
    fn cycle_via_patch_is_rejected_and_reverted() {
        let mut engine = Engine::new();
        engine
            .set_graph(
                r#"{"nodes":[
                    {"id":"a","kind":"constant","params":{"value":1.0}},
                    {"id":"b","kind":"add","params":{}}
                ],"edges":[
                    {"id":"e1","from":"a","to":"b","from_port":"out","to_port":"a"}
                ]}"#,
            )
            .unwrap();
        let err = engine.patch_graph(&patch(
            vec![],
            vec![],
            vec![edge_json("e2", "b", "a", "a")],
            vec![],
        ));
        assert!(err.is_err());
        assert!(!engine.can_connect("b", "a"));
        assert!(!engine.graph_json().contains("e2"));
        let out = engine.run().unwrap();
        assert_eq!(out["b"]["value"], json!(1.0));
    }

    #[test]
    fn edge_removal_marks_target_dirty() {
        let mut engine = Engine::new();
        engine
            .set_graph(
                r#"{"nodes":[
                    {"id":"a","kind":"constant","params":{"value":4.0}},
                    {"id":"b","kind":"add","params":{}}
                ],"edges":[
                    {"id":"e1","from":"a","to":"b","from_port":"out","to_port":"a"}
                ]}"#,
            )
            .unwrap();
        engine.run().unwrap();
        let dirty = engine.patch_graph(r#"{"edges_removed":["e1"]}"#).unwrap();
        assert!(dirty.contains(&"b".to_string()));
        let out = engine.run().unwrap();
        assert_eq!(out["b"]["value"], json!(0.0));
    }

    #[test]
    fn node_kinds_expose_registry() {
        let engine = Engine::new();
        let kinds = engine.node_kinds();
        assert!(kinds.iter().any(|(k, _)| *k == "add"));
        assert!(kinds.iter().any(|(k, _)| *k == "ifelse"));
    }

    #[test]
    fn graph_json_roundtrips() {
        let mut engine = Engine::new();
        engine
            .set_graph(r#"{"nodes":[{"id":"a","kind":"constant","params":{"value":9.0}}]}"#)
            .unwrap();
        let json = engine.graph_json();
        engine.set_graph(&json).unwrap();
        let out = engine.run().unwrap();
        assert_eq!(out["a"]["value"], json!(9.0));
    }

    #[test]
    fn text_nodes_concat_uppercase_length() {
        let mut engine = Engine::new();
        engine
            .set_graph(
                r#"{"nodes":[
                    {"id":"t1","kind":"text","params":{"text":"Hello"}},
                    {"id":"t2","kind":"text","params":{"text":" world"}},
                    {"id":"c","kind":"concat","params":{}},
                    {"id":"u","kind":"uppercase","params":{}},
                    {"id":"l","kind":"lowercase","params":{}},
                    {"id":"n","kind":"length","params":{}}
                ],"edges":[
                    {"id":"e1","from":"t1","to":"c","from_port":"value","to_port":"a"},
                    {"id":"e2","from":"t2","to":"c","from_port":"value","to_port":"b"},
                    {"id":"e3","from":"c","to":"u","from_port":"out","to_port":"text"},
                    {"id":"e4","from":"c","to":"l","from_port":"out","to_port":"text"},
                    {"id":"e5","from":"c","to":"n","from_port":"out","to_port":"text"}
                ]}"#,
            )
            .unwrap();
        let out = engine.run().unwrap();
        assert_eq!(out["c"]["value"], json!("Hello world"));
        assert_eq!(out["u"]["value"], json!("HELLO WORLD"));
        assert_eq!(out["l"]["value"], json!("hello world"));
        assert_eq!(out["n"]["value"], json!(11.0));
    }

    #[test]
    fn stringify_coerces_numbers() {
        let mut engine = Engine::new();
        engine
            .set_graph(
                r#"{"nodes":[
                    {"id":"a","kind":"constant","params":{"value":42.0}},
                    {"id":"s","kind":"stringify","params":{}}
                ],"edges":[
                    {"id":"e1","from":"a","to":"s","from_port":"out","to_port":"in"}
                ]}"#,
            )
            .unwrap();
        let out = engine.run().unwrap();
        assert_eq!(out["s"]["value"], json!("42"));
    }
}

#[cfg(test)]
mod camelcase_tests {
    use super::*;

    #[test]
    fn patch_import_camelcase_edges_concat() {
        let mut engine = Engine::new();
        let patch_json = r#"{"nodes_added":[
            {"id":"t1","kind":"text","params":{"text":"Hello"}},
            {"id":"t2","kind":"text","params":{"text":" world"}},
            {"id":"c","kind":"concat","params":{}}
        ],"edges_added":[
            {"id":"e1","from":"t1","to":"c","fromPort":"value","toPort":"a"},
            {"id":"e2","from":"t2","to":"c","fromPort":"value","toPort":"b"}
        ]}"#;
        let dirty = engine.patch_graph(patch_json).unwrap();
        println!("dirty: {dirty:?}");
        assert!(dirty.contains(&"t1".to_string()));
        let out = engine.run().unwrap();
        println!("out: {out}");
        assert_eq!(out["c"]["value"], serde_json::json!("Hello world"));
    }
}
