use std::collections::BTreeMap;

type Params = BTreeMap<String, serde_json::Value>;

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Number(f64),
    Bool(bool),
    Str(String),
    Null,
}

impl Value {
    pub fn type_name(&self) -> &'static str {
        match self {
            Value::Number(_) => "number",
            Value::Bool(_) => "bool",
            Value::Str(_) => "string",
            Value::Null => "null",
        }
    }

    pub fn as_f64(&self) -> f64 {
        match self {
            Value::Number(n) => *n,
            Value::Bool(b) => {
                if *b {
                    1.0
                } else {
                    0.0
                }
            }
            Value::Str(s) => s.parse::<f64>().unwrap_or(0.0),
            Value::Null => 0.0,
        }
    }

    pub fn as_bool(&self) -> bool {
        match self {
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0,
            Value::Str(s) => !s.is_empty(),
            Value::Null => false,
        }
    }

    pub fn to_json(&self) -> serde_json::Value {
        match self {
            Value::Number(n) => {
                serde_json::json!({ "type": "number", "value": Self::number_json(*n) })
            }
            Value::Bool(b) => serde_json::json!({ "type": "bool", "value": b }),
            Value::Str(s) => serde_json::json!({ "type": "string", "value": s }),
            Value::Null => serde_json::json!({ "type": "null" }),
        }
    }

    fn number_json(n: f64) -> serde_json::Value {
        if n.is_nan() {
            serde_json::json!("NaN")
        } else if n.is_infinite() {
            serde_json::json!(if n > 0.0 { "inf" } else { "-inf" })
        } else {
            serde_json::json!(n)
        }
    }
}

#[derive(Debug, Clone)]
pub struct NodeCtx<'a> {
    pub inputs: &'a [Value],
    pub params: &'a Params,
}

impl<'a> NodeCtx<'a> {
    pub fn input_f64(&self, index: usize, default: f64) -> f64 {
        match self.inputs.get(index) {
            Some(v) => v.as_f64(),
            None => default,
        }
    }

    pub fn input_bool(&self, index: usize, default: bool) -> bool {
        match self.inputs.get(index) {
            Some(v) => v.as_bool(),
            None => default,
        }
    }

    pub fn input_str(&self, index: usize, default: &str) -> String {
        match self.inputs.get(index) {
            Some(Value::Str(s)) => s.clone(),
            Some(other) => other.as_f64().to_string(),
            None => default.to_string(),
        }
    }

    pub fn param_f64(&self, key: &str, default: f64) -> f64 {
        match self.params.get(key) {
            Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(default),
            Some(serde_json::Value::Bool(b)) => {
                if *b {
                    1.0
                } else {
                    0.0
                }
            }
            _ => default,
        }
    }

    pub fn param_bool(&self, key: &str, default: bool) -> bool {
        match self.params.get(key) {
            Some(serde_json::Value::Bool(b)) => *b,
            _ => default,
        }
    }

    pub fn param_str(&self, key: &str, default: &str) -> String {
        match self.params.get(key) {
            Some(serde_json::Value::String(s)) => s.clone(),
            Some(serde_json::Value::Number(n)) => n.as_f64().unwrap_or(0.0).to_string(),
            _ => default.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn json_roundtrip_of_special_numbers() {
        let nan = Value::Number(f64::NAN).to_json();
        assert_eq!(nan["value"], serde_json::json!("NaN"));
        let inf = Value::Number(f64::INFINITY).to_json();
        assert_eq!(inf["value"], serde_json::json!("inf"));
    }

    #[test]
    fn bool_coercion() {
        assert_eq!(Value::Bool(true).as_f64(), 1.0);
        assert_eq!(Value::Bool(false).as_f64(), 0.0);
        assert!(!Value::Number(0.0).as_bool());
        assert!(Value::Number(2.5).as_bool());
    }

    #[test]
    fn param_lookup() {
        let params: Params = BTreeMap::from([("value".to_string(), serde_json::json!(3.0))]);
        let ctx = NodeCtx {
            inputs: &[],
            params: &params,
        };
        assert_eq!(ctx.param_f64("value", 0.0), 3.0);
        assert_eq!(ctx.param_f64("missing", 7.0), 7.0);
    }
}
