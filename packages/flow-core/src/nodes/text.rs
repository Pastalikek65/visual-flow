use super::{NodeImpl, PortSpec};
use crate::value::{NodeCtx, Value};

pub struct Text;

impl NodeImpl for Text {
    fn label(&self) -> &'static str {
        "Text"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "value",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Str(ctx.param_str("text", ""))
    }
}

pub struct Concat;

impl NodeImpl for Concat {
    fn label(&self) -> &'static str {
        "Concat"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[
            PortSpec {
                name: "a",
                kind: "string",
            },
            PortSpec {
                name: "b",
                kind: "string",
            },
        ]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Str(format!("{}{}", ctx.input_str(0, ""), ctx.input_str(1, "")))
    }
}

pub struct Uppercase;

impl NodeImpl for Uppercase {
    fn label(&self) -> &'static str {
        "Uppercase"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "text",
            kind: "string",
        }]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Str(ctx.input_str(0, "").to_uppercase())
    }
}

pub struct Lowercase;

impl NodeImpl for Lowercase {
    fn label(&self) -> &'static str {
        "Lowercase"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "text",
            kind: "string",
        }]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Str(ctx.input_str(0, "").to_lowercase())
    }
}

pub struct Length;

impl NodeImpl for Length {
    fn label(&self) -> &'static str {
        "Length"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "text",
            kind: "string",
        }]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "number",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Number(ctx.input_str(0, "").chars().count() as f64)
    }
}

pub struct Stringify;

impl NodeImpl for Stringify {
    fn label(&self) -> &'static str {
        "To String"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "in",
            kind: "any",
        }]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        let s = match ctx.inputs.first() {
            Some(Value::Str(s)) => s.clone(),
            Some(Value::Number(n)) => {
                if n.fract() == 0.0 {
                    format!("{}", *n as i64)
                } else {
                    format!("{n}")
                }
            }
            Some(Value::Bool(b)) => b.to_string(),
            None | Some(Value::Null) => String::new(),
        };
        Value::Str(s)
    }
}

pub struct Substring;

impl NodeImpl for Substring {
    fn label(&self) -> &'static str {
        "Substring"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[
            PortSpec {
                name: "text",
                kind: "string",
            },
            PortSpec {
                name: "start",
                kind: "number",
            },
            PortSpec {
                name: "len",
                kind: "number",
            },
        ]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        let text: Vec<char> = ctx.input_str(0, "").chars().collect();
        let start = ctx.input_f64(1, 0.0).max(0.0) as usize;
        let len = ctx.input_f64(2, 0.0).max(0.0) as usize;
        let slice: String = text.iter().skip(start).take(len).collect();
        Value::Str(slice)
    }
}

pub struct Trim;

impl NodeImpl for Trim {
    fn label(&self) -> &'static str {
        "Trim"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "text",
            kind: "string",
        }]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Str(ctx.input_str(0, "").trim().to_string())
    }
}

pub struct Replace;

impl NodeImpl for Replace {
    fn label(&self) -> &'static str {
        "Replace"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[
            PortSpec {
                name: "text",
                kind: "string",
            },
            PortSpec {
                name: "needle",
                kind: "string",
            },
            PortSpec {
                name: "replacement",
                kind: "string",
            },
        ]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "string",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Str(
            ctx.input_str(0, "")
                .replace(&ctx.input_str(1, ""), &ctx.input_str(2, "")),
        )
    }
}

pub struct Includes;

impl NodeImpl for Includes {
    fn label(&self) -> &'static str {
        "Includes"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[
            PortSpec {
                name: "text",
                kind: "string",
            },
            PortSpec {
                name: "needle",
                kind: "string",
            },
        ]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "bool",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Bool(ctx.input_str(0, "").contains(&ctx.input_str(1, "")))
    }
}

pub struct StartsWith;

impl NodeImpl for StartsWith {
    fn label(&self) -> &'static str {
        "Starts With"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[
            PortSpec {
                name: "text",
                kind: "string",
            },
            PortSpec {
                name: "prefix",
                kind: "string",
            },
        ]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "bool",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Bool(ctx.input_str(0, "").starts_with(&ctx.input_str(1, "")))
    }
}

pub struct ParseNum;

impl NodeImpl for ParseNum {
    fn label(&self) -> &'static str {
        "Parse Number"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "text",
            kind: "string",
        }]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "number",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Number(ctx.input_str(0, "").trim().parse::<f64>().unwrap_or(0.0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::value::{NodeCtx, Value};
    use std::collections::BTreeMap;

    static EMPTY: BTreeMap<String, serde_json::Value> = BTreeMap::new();

    fn ctx(inputs: Vec<Value>) -> NodeCtx<'static> {
        NodeCtx {
            inputs: Box::leak(inputs.into_boxed_slice()),
            params: &EMPTY,
        }
    }

    #[test]
    fn substring_clamps_bounds() {
        let c = ctx(vec![
            Value::Str("Hello world".into()),
            Value::Number(6.0),
            Value::Number(5.0),
        ]);
        assert_eq!(Substring.compute(&c), Value::Str("world".into()));
        let c = ctx(vec![
            Value::Str("hi".into()),
            Value::Number(0.0),
            Value::Number(100.0),
        ]);
        assert_eq!(Substring.compute(&c), Value::Str("hi".into()));
    }

    #[test]
    fn trim_and_replace_work() {
        let c = ctx(vec![Value::Str("  hi  ".into())]);
        assert_eq!(Trim.compute(&c), Value::Str("hi".into()));
        let c = ctx(vec![
            Value::Str("aaXaa".into()),
            Value::Str("X".into()),
            Value::Str("b".into()),
        ]);
        assert_eq!(Replace.compute(&c), Value::Str("aabaa".into()));
    }

    #[test]
    fn includes_and_prefix() {
        let c = ctx(vec![
            Value::Str("Hello world".into()),
            Value::Str("world".into()),
        ]);
        assert_eq!(Includes.compute(&c), Value::Bool(true));
        let c = ctx(vec![
            Value::Str("Hello world".into()),
            Value::Str("xyz".into()),
        ]);
        assert_eq!(Includes.compute(&c), Value::Bool(false));
        let c = ctx(vec![Value::Str("Hello".into()), Value::Str("He".into())]);
        assert_eq!(StartsWith.compute(&c), Value::Bool(true));
    }

    #[test]
    fn parse_number_fmt() {
        let c = ctx(vec![Value::Str("  -3.5  ".into())]);
        assert_eq!(ParseNum.compute(&c), Value::Number(-3.5));
        let c = ctx(vec![Value::Str("abc".into())]);
        assert_eq!(ParseNum.compute(&c), Value::Number(0.0));
    }
}
