use crate::graph::GraphState;
use std::collections::BTreeSet;

pub fn dirty_closure(g: &GraphState, seeds: &BTreeSet<String>) -> BTreeSet<String> {
    let mut dirty = seeds.clone();
    for seed in seeds {
        let downstream = g.reachable_from(seed);
        for id in downstream {
            if g.nodes.contains_key(&id) {
                dirty.insert(id);
            }
        }
    }
    dirty
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{EdgeDef, NodeDef, WireGraph};
    use std::collections::BTreeMap;

    fn g(edges: &[(&str, &str)]) -> GraphState {
        let mut nodes = BTreeMap::new();
        for (f, t) in edges {
            nodes.entry(f.to_string()).or_insert(NodeDef {
                id: f.to_string(),
                kind: "add".to_string(),
                params: BTreeMap::new(),
                x: 0.0,
                y: 0.0,
            });
            nodes.entry(t.to_string()).or_insert(NodeDef {
                id: t.to_string(),
                kind: "add".to_string(),
                params: BTreeMap::new(),
                x: 0.0,
                y: 0.0,
            });
        }
        let edges = edges
            .iter()
            .enumerate()
            .map(|(i, (f, t))| EdgeDef {
                id: format!("e{i}"),
                from: f.to_string(),
                to: t.to_string(),
                from_port: "out".to_string(),
                to_port: "in".to_string(),
            })
            .collect();
        GraphState::from(WireGraph {
            nodes: nodes.into_values().collect(),
            edges,
        })
    }

    #[test]
    fn seed_propagates_downstream_only() {
        let graph = g(&[("a", "b"), ("b", "c"), ("d", "e")]);
        let seeds = BTreeSet::from(["a".to_string()]);
        let dirty = dirty_closure(&graph, &seeds);
        assert!(dirty.contains("a"));
        assert!(dirty.contains("b"));
        assert!(dirty.contains("c"));
        assert!(!dirty.contains("d"));
        assert!(!dirty.contains("e"));
    }

    #[test]
    fn remove_edge_dirties_target_closed_sum() {
        let graph = g(&[("a", "b"), ("b", "c")]);
        let seeds = BTreeSet::from(["b".to_string()]);
        let dirty = dirty_closure(&graph, &seeds);
        assert_eq!(dirty.len(), 2);
        assert!(dirty.contains("b") && dirty.contains("c"));
    }
}
