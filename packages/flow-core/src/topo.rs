use crate::graph::GraphState;
use std::collections::BTreeMap;

pub fn topo_order(g: &GraphState) -> Result<Vec<String>, String> {
    let mut indegree: BTreeMap<String, usize> = BTreeMap::new();
    for id in g.nodes.keys() {
        indegree.insert(id.clone(), 0);
    }
    for edge in g.edges.values() {
        if let Some(deg) = indegree.get_mut(&edge.to) {
            *deg += 1;
        }
    }

    let mut queue: Vec<String> = indegree
        .iter()
        .filter_map(|(id, deg)| if *deg == 0 { Some(id.clone()) } else { None })
        .collect();
    queue.sort();

    let mut order = Vec::with_capacity(g.nodes.len());
    let mut outgoing = Vec::from_iter(g.edges.values().map(|e| (e.from.clone(), e.to.clone())));
    outgoing.sort();

    while let Some(id) = queue.pop() {
        order.push(id.clone());
        let targets: Vec<String> = outgoing
            .iter()
            .filter(|(from, _)| *from == id)
            .map(|(_, to)| to.clone())
            .collect();
        for target in targets {
            if let Some(deg) = indegree.get_mut(&target) {
                *deg -= 1;
                if *deg == 0 {
                    queue.push(target);
                    queue.sort();
                }
            }
        }
    }

    if order.len() != g.nodes.len() {
        let cyclic: Vec<String> = indegree
            .iter()
            .filter(|(_, deg)| **deg > 0)
            .map(|(id, _)| id.clone())
            .take(1)
            .collect();
        return Err(cyclic.first().cloned().unwrap_or_else(|| "?".to_string()));
    }

    Ok(order)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::{EdgeDef, NodeDef, WireGraph};
    use std::collections::BTreeMap;

    fn make_graph(edges: &[(&str, &str)]) -> GraphState {
        let mut nodes = BTreeMap::new();
        for (from, to) in edges {
            nodes.entry(from.to_string()).or_insert(NodeDef {
                id: from.to_string(),
                kind: "add".to_string(),
                params: BTreeMap::new(),
                x: 0.0,
                y: 0.0,
            });
            nodes.entry(to.to_string()).or_insert(NodeDef {
                id: to.to_string(),
                kind: "add".to_string(),
                params: BTreeMap::new(),
                x: 0.0,
                y: 0.0,
            });
        }
        if nodes.is_empty() {
            nodes.insert(
                "solo".to_string(),
                NodeDef {
                    id: "solo".to_string(),
                    kind: "add".to_string(),
                    params: BTreeMap::new(),
                    x: 0.0,
                    y: 0.0,
                },
            );
        }
        let edges: Vec<EdgeDef> = edges
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
        let w = WireGraph {
            nodes: nodes.into_values().collect(),
            edges,
        };
        GraphState::from(w)
    }

    #[test]
    fn linear_chain_orders_end_to_start() {
        let g = make_graph(&[("a", "b"), ("b", "c")]);
        let order = topo_order(&g).unwrap();
        assert_eq!(order, vec!["a", "b", "c"]);
    }

    #[test]
    fn diamond_produces_valid_order() {
        let g = make_graph(&[("a", "b"), ("a", "c"), ("b", "d"), ("c", "d")]);
        let order = topo_order(&g).unwrap();
        assert_eq!(order.len(), 4);
        let pos = |id: &str| order.iter().position(|x| x == id).unwrap();
        assert!(pos("a") < pos("b") && pos("b") < pos("d"));
        assert!(pos("a") < pos("c") && pos("c") < pos("d"));
    }

    #[test]
    fn solo_node_orders_first() {
        let g = make_graph(&[]);
        assert_eq!(topo_order(&g).unwrap(), vec!["solo"]);
    }

    #[test]
    fn cycle_is_rejected() {
        let g = make_graph(&[("a", "b"), ("b", "a")]);
        assert!(topo_order(&g).is_err());
    }
}
