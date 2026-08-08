use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub type NodeId = String;
pub type EdgeId = String;

pub fn default_port() -> String {
    "out".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeDef {
    pub id: NodeId,
    pub kind: String,
    #[serde(default)]
    pub params: BTreeMap<String, serde_json::Value>,
    #[serde(default = "default_pos")]
    pub x: f64,
    #[serde(default = "default_pos")]
    pub y: f64,
}

fn default_pos() -> f64 {
    0.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeDef {
    pub id: EdgeId,
    pub from: NodeId,
    pub to: NodeId,
    #[serde(default = "default_port")]
    pub from_port: String,
    #[serde(default = "default_port")]
    pub to_port: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct GraphState {
    pub nodes: BTreeMap<NodeId, NodeDef>,
    pub edges: BTreeMap<EdgeId, EdgeDef>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct WireGraph {
    pub nodes: Vec<NodeDef>,
    pub edges: Vec<EdgeDef>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(default)]
pub struct WirePatch {
    pub nodes_added: Vec<NodeDef>,
    pub nodes_removed: Vec<NodeId>,
    pub nodes_changed: Vec<NodeDef>,
    pub edges_added: Vec<EdgeDef>,
    pub edges_removed: Vec<EdgeId>,
}

impl From<WireGraph> for GraphState {
    fn from(w: WireGraph) -> Self {
        let mut nodes = BTreeMap::new();
        for n in w.nodes {
            nodes.insert(n.id.clone(), n);
        }
        let mut edges = BTreeMap::new();
        for e in w.edges {
            edges.insert(e.id.clone(), e);
        }
        GraphState { nodes, edges }
    }
}

impl From<&GraphState> for WireGraph {
    fn from(g: &GraphState) -> Self {
        WireGraph {
            nodes: g.nodes.values().cloned().collect(),
            edges: g.edges.values().cloned().collect(),
        }
    }
}

impl GraphState {
    pub fn adjacent(&self) -> BTreeMap<NodeId, Vec<(NodeId, EdgeId)>> {
        let mut out: BTreeMap<NodeId, Vec<(NodeId, EdgeId)>> = BTreeMap::new();
        for id in self.nodes.keys() {
            out.insert(id.clone(), Vec::new());
        }
        for e in self.edges.values() {
            if let Some(list) = out.get_mut(&e.from) {
                list.push((e.to.clone(), e.id.clone()));
            }
        }
        out
    }

    pub fn reachable_from(&self, start: &str) -> Vec<NodeId> {
        let adj = self.adjacent();
        let mut seen: BTreeMap<NodeId, bool> = BTreeMap::new();
        let mut stack = vec![start.to_string()];
        while let Some(id) = stack.pop() {
            if seen.insert(id.clone(), false).is_some() {
                continue;
            }
            if let Some(children) = adj.get(&id) {
                for (child, _) in children {
                    if !seen.contains_key(child) {
                        stack.push(child.clone());
                    }
                }
            }
        }
        let mut out: Vec<NodeId> = seen.keys().cloned().collect();
        out.retain(|id| id != start);
        out
    }

    pub fn can_connect(&self, from: &str, to: &str) -> bool {
        if from == to {
            return false;
        }
        if !self.nodes.contains_key(from) || !self.nodes.contains_key(to) {
            return false;
        }
        !self.reachable_from(to).iter().any(|x| x.as_str() == from)
    }

    pub fn apply_remove(&mut self, node: &NodeId) {
        self.nodes.remove(node);
        self.edges.retain(|_, e| e.from != *node && e.to != *node);
    }
}
