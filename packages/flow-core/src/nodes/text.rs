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
