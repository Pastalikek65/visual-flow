use super::{NodeImpl, PortSpec};
use crate::value::{NodeCtx, Value};

pub struct Constant;

impl NodeImpl for Constant {
    fn label(&self) -> &'static str {
        "Constant"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "value",
            kind: "number",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Number(ctx.param_f64("value", 0.0))
    }
}

pub struct Slider;

impl NodeImpl for Slider {
    fn label(&self) -> &'static str {
        "Slider"
    }

    fn inputs(&self) -> &'static [PortSpec] {
        &[]
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "value",
            kind: "number",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        Value::Number(ctx.param_f64("value", ctx.param_f64("min", 0.0)))
    }
}

pub struct Output;

impl NodeImpl for Output {
    fn label(&self) -> &'static str {
        "Output"
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
            kind: "any",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        match ctx.inputs.first() {
            Some(v) => v.clone(),
            None => Value::Null,
        }
    }
}
