use crate::value::{NodeCtx, Value};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PortSpec {
    pub name: &'static str,
    pub kind: &'static str,
}

pub trait NodeImpl: Send + Sync {
    fn label(&self) -> &'static str;
    fn inputs(&self) -> &'static [PortSpec];
    fn outputs(&self) -> &'static [PortSpec];
    fn compute(&self, ctx: &NodeCtx) -> Value;
}

pub struct Registry {
    kinds: &'static [(&'static str, &'static dyn NodeImpl)],
}

impl Registry {
    pub fn builtin() -> Self {
        Registry {
            kinds: &[
                ("add", &MathNode::Add),
                ("sub", &MathNode::Sub),
                ("mul", &MathNode::Mul),
                ("div", &MathNode::Div),
                ("pow", &MathNode::Pow),
                ("sin", &MathNode::Sin),
                ("cos", &MathNode::Cos),
                ("min", &MathNode::Min),
                ("max", &MathNode::Max),
                ("and", &LogicNode::And),
                ("or", &LogicNode::Or),
                ("not", &LogicNode::Not),
                ("equal", &LogicNode::Equal),
                ("greater", &LogicNode::Greater),
                ("less", &LogicNode::Less),
                ("ge", &LogicNode::Ge),
                ("ifelse", &LogicNode::IfElse),
                ("constant", &io::Constant),
                ("slider", &io::Slider),
                ("output", &io::Output),
            ],
        }
    }

    pub fn get(&self, kind: &str) -> Option<&'static dyn NodeImpl> {
        self.kinds.iter().find(|(k, _)| *k == kind).map(|(_, n)| *n)
    }

    pub fn kinds(&self) -> Vec<(&'static str, &'static str)> {
        self.kinds.iter().map(|(k, n)| (*k, n.label())).collect()
    }
}

#[derive(Clone, Copy)]
pub enum MathNode {
    Add,
    Sub,
    Mul,
    Div,
    Pow,
    Sin,
    Cos,
    Min,
    Max,
}

impl NodeImpl for MathNode {
    fn label(&self) -> &'static str {
        match self {
            MathNode::Add => "Add",
            MathNode::Sub => "Subtract",
            MathNode::Mul => "Multiply",
            MathNode::Div => "Divide",
            MathNode::Pow => "Power",
            MathNode::Sin => "Sine",
            MathNode::Cos => "Cosine",
            MathNode::Min => "Min",
            MathNode::Max => "Max",
        }
    }

    fn inputs(&self) -> &'static [PortSpec] {
        match self {
            MathNode::Pow => &[
                PortSpec {
                    name: "base",
                    kind: "number",
                },
                PortSpec {
                    name: "exp",
                    kind: "number",
                },
            ],
            MathNode::Sin | MathNode::Cos => &[PortSpec {
                name: "x",
                kind: "number",
            }],
            _ => &[
                PortSpec {
                    name: "a",
                    kind: "number",
                },
                PortSpec {
                    name: "b",
                    kind: "number",
                },
            ],
        }
    }

    fn outputs(&self) -> &'static [PortSpec] {
        &[PortSpec {
            name: "out",
            kind: "number",
        }]
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        let one = |ctx: &NodeCtx, i: usize| ctx.input_f64(i, 0.0);
        let out = match self {
            MathNode::Add => one(ctx, 0) + one(ctx, 1),
            MathNode::Sub => one(ctx, 0) - one(ctx, 1),
            MathNode::Mul => one(ctx, 0) * one(ctx, 1),
            MathNode::Div => one(ctx, 0) / one(ctx, 1),
            MathNode::Pow => one(ctx, 0).powf(one(ctx, 1)),
            MathNode::Sin => one(ctx, 0).sin(),
            MathNode::Cos => one(ctx, 0).cos(),
            MathNode::Min => one(ctx, 0).min(one(ctx, 1)),
            MathNode::Max => one(ctx, 0).max(one(ctx, 1)),
        };
        Value::Number(out)
    }
}

#[derive(Clone, Copy)]
pub enum LogicNode {
    And,
    Or,
    Not,
    Equal,
    Greater,
    Less,
    Ge,
    IfElse,
}

impl NodeImpl for LogicNode {
    fn label(&self) -> &'static str {
        match self {
            LogicNode::And => "AND",
            LogicNode::Or => "OR",
            LogicNode::Not => "NOT",
            LogicNode::Equal => "Equal",
            LogicNode::Greater => "Greater Than",
            LogicNode::Less => "Less Than",
            LogicNode::Ge => "Greater/Equal",
            LogicNode::IfElse => "If / Else",
        }
    }

    fn inputs(&self) -> &'static [PortSpec] {
        match self {
            LogicNode::And | LogicNode::Or => &[
                PortSpec {
                    name: "a",
                    kind: "bool",
                },
                PortSpec {
                    name: "b",
                    kind: "bool",
                },
            ],
            LogicNode::Not => &[PortSpec {
                name: "x",
                kind: "bool",
            }],
            LogicNode::Equal | LogicNode::Greater | LogicNode::Less | LogicNode::Ge => &[
                PortSpec {
                    name: "a",
                    kind: "number",
                },
                PortSpec {
                    name: "b",
                    kind: "number",
                },
            ],
            LogicNode::IfElse => &[
                PortSpec {
                    name: "cond",
                    kind: "bool",
                },
                PortSpec {
                    name: "then",
                    kind: "number",
                },
                PortSpec {
                    name: "else",
                    kind: "number",
                },
            ],
        }
    }

    fn outputs(&self) -> &'static [PortSpec] {
        match self {
            LogicNode::IfElse => &[PortSpec {
                name: "out",
                kind: "number",
            }],
            _ => &[PortSpec {
                name: "out",
                kind: "bool",
            }],
        }
    }

    fn compute(&self, ctx: &NodeCtx) -> Value {
        match self {
            LogicNode::And => Value::Bool(ctx.input_bool(0, false) && ctx.input_bool(1, false)),
            LogicNode::Or => Value::Bool(ctx.input_bool(0, false) || ctx.input_bool(1, false)),
            LogicNode::Not => Value::Bool(!ctx.input_bool(0, false)),
            LogicNode::Equal => Value::Bool(ctx.input_f64(0, 0.0) == ctx.input_f64(1, 0.0)),
            LogicNode::Greater => Value::Bool(ctx.input_f64(0, 0.0) > ctx.input_f64(1, 0.0)),
            LogicNode::Less => Value::Bool(ctx.input_f64(0, 0.0) < ctx.input_f64(1, 0.0)),
            LogicNode::Ge => Value::Bool(ctx.input_f64(0, 0.0) >= ctx.input_f64(1, 0.0)),
            LogicNode::IfElse => {
                let cond = ctx.input_bool(0, false);
                Value::Number(if cond {
                    ctx.input_f64(1, 0.0)
                } else {
                    ctx.input_f64(2, 0.0)
                })
            }
        }
    }
}

mod io;
