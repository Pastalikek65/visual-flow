pub mod compile;
pub mod eval;
pub mod graph;
pub mod incremental;
pub mod nodes;
pub mod topo;
pub mod value;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct FlowEngine {
    engine: eval::Engine,
}

impl FlowEngine {
    pub fn native() -> Self {
        FlowEngine {
            engine: eval::Engine::new(),
        }
    }
}

#[wasm_bindgen]
impl FlowEngine {
    #[allow(clippy::new_without_default)]
    #[wasm_bindgen(constructor)]
    pub fn new() -> FlowEngine {
        FlowEngine {
            engine: eval::Engine::new(),
        }
    }

    pub fn set_graph(&mut self, json: &str) -> Result<(), JsValue> {
        self.engine
            .set_graph(json)
            .map_err(|e| JsValue::from_str(&e))
    }

    pub fn patch_graph(&mut self, json: &str) -> Result<Vec<JsValue>, JsValue> {
        let dirty = self
            .engine
            .patch_graph(json)
            .map_err(|e| JsValue::from_str(&e))?;
        Ok(dirty.into_iter().map(|id| JsValue::from_str(&id)).collect())
    }

    pub fn run(&mut self) -> Result<String, JsValue> {
        let results = self.engine.run().map_err(|e| JsValue::from_str(&e))?;
        serde_json::to_string(&results).map_err(|e| JsValue::from_str(&e.to_string()))
    }

    pub fn query(&self, node_id: &str) -> Result<String, JsValue> {
        match self.engine.query(node_id) {
            Some(v) => {
                serde_json::to_string(&v.to_json()).map_err(|e| JsValue::from_str(&e.to_string()))
            }
            None => Ok("{\"type\":\"null\"}".to_string()),
        }
    }

    pub fn can_connect(&self, from: &str, to: &str) -> bool {
        self.engine.can_connect(from, to)
    }

    pub fn graph_json(&self) -> String {
        self.engine.graph_json()
    }

    pub fn dirty_len(&self) -> usize {
        self.engine.dirty_len()
    }
}
