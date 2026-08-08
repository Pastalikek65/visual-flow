use crate::graph::GraphState;
use crate::topo::topo_order;
use std::collections::BTreeMap;

pub struct PlanNode {
    pub id: String,
    pub kind: String,
    pub params: BTreeMap<String, serde_json::Value>,
    pub inbound: BTreeMap<String, String>,
}

pub struct Plan {
    pub order: Vec<PlanNode>,
}

pub fn build_plan(g: &GraphState) -> Result<Plan, String> {
    let order = topo_order(g)?;
    let mut nodes = Vec::with_capacity(order.len());
    for id in order {
        let node = g
            .nodes
            .get(&id)
            .ok_or_else(|| format!("missing node {id}"))?;
        let mut inbound = BTreeMap::new();
        for edge in g.edges.values() {
            if edge.to == id {
                inbound.insert(edge.to_port.clone(), edge.from.clone());
            }
        }
        nodes.push(PlanNode {
            id: node.id.clone(),
            kind: node.kind.clone(),
            params: node.params.clone(),
            inbound,
        });
    }
    Ok(Plan { order: nodes })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{EdgeDef, NodeDef, WireGraph};
    use std::collections::BTreeMap;

    fn two_nodes(edge: bool) -> GraphState {
        let nodes = vec![
            NodeDef {
                id: "a".to_string(),
                kind: "constant".to_string(),
                params: BTreeMap::from([("value".to_string(), serde_json::json!(3.0))]),
                x: 0.0,
                y: 0.0,
            },
            NodeDef {
                id: "b".to_string(),
                kind: "add".to_string(),
                params: BTreeMap::new(),
                x: 10.0,
                y: 10.0,
            },
        ];
        let edges = if edge {
            vec![EdgeDef {
                id: "e1".to_string(),
                from: "a".to_string(),
                to: "b".to_string(),
                from_port: "out".to_string(),
                to_port: "a".to_string(),
            }]
        } else {
            Vec::new()
        };
        GraphState::from(WireGraph { nodes, edges })
    }

    #[test]
    fn plan_records_inbound_mapping() {
        let g = two_nodes(true);
        let plan = build_plan(&g).unwrap();
        assert_eq!(plan.order.len(), 2);
        let b = plan.order.iter().find(|n| n.id == "b").unwrap();
        assert_eq!(b.inbound.get("a"), Some(&"a".to_string()));
    }

    #[test]
    fn plan_without_edge_has_no_binding() {
        let g = two_nodes(false);
        let plan = build_plan(&g).unwrap();
        let b = plan.order.iter().find(|n| n.id == "b").unwrap();
        assert!(b.inbound.is_empty());
    }
}
