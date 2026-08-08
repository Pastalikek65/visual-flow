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
            ("tan", &MathNode::Tan),
            ("min", &MathNode::Min),
            ("max", &MathNode::Max),
            ("abs", &MathNode::Abs),
            ("sqrt", &MathNode::Sqrt),
            ("log", &MathNode::Log),
            ("floor", &MathNode::Floor),
            ("ceil", &MathNode::Ceil),
            ("round", &MathNode::Round),
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
            ("text", &Text),
            ("concat", &Concat),
            ("uppercase", &Uppercase),
            ("lowercase", &Lowercase),
            ("length", &Length),
            ("stringify", &Stringify),
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
    Tan,
    Min,
    Max,
    Abs,
    Sqrt,
    Log,
    Floor,
    Ceil,
    Round,
}

// Single-input math nodes (kind "number" -> "number")
fn single_spec() -> [PortSpec; 1] {
    [PortSpec {
        name: "x",
        kind: "number",
    }]
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
            MathNode::Tan => "Tangent",
            MathNode::Min => "Min",
            MathNode::Max => "Max",
            MathNode::Abs => "Abs",
            MathNode::Sqrt => "Square Root",
            MathNode::Log => "Log",
            MathNode::Floor => "Floor",
            MathNode::Ceil => "Ceil",
            MathNode::Round => "Round",
        }
    }

    fn inputs(&self) -> &'static [PortSpec] {
        use std::sync::OnceLock;
        static SINGLE: OnceLock<[PortSpec; 1]> = OnceLock::new();
        static ADD: OnceLock<[PortSpec; 2]> = OnceLock::new();
        static POW: OnceLock<[PortSpec; 2]> = OnceLock::new();
        match self {
            MathNode::Pow => POW.get_or_init(|| {
                [
                    PortSpec {
                        name: "base",
                        kind: "number",
                    },
                    PortSpec {
                        name: "exp",
                        kind: "number",
                    },
                ]
            }),
            MathNode::Sin | MathNode::Cos | MathNode::Tan | MathNode::Abs | MathNode::Sqrt
            | MathNode::Log | MathNode::Floor | MathNode::Ceil | MathNode::Round => {
                SINGLE.get_or_init(single_spec)
            }
            _ => ADD.get_or_init(|| {
                [
                    PortSpec {
                        name: "a",
                        kind: "number",
                    },
                    PortSpec {
                        name: "b",
                        kind: "number",
                    },
                ]
            }),
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
            MathNode::Tan => one(ctx, 0).tan(),
            MathNode::Min => one(ctx, 0).min(one(ctx, 1)),
            MathNode::Max => one(ctx, 0).max(one(ctx, 1)),
            MathNode::Abs => one(ctx, 0).abs(),
            MathNode::Sqrt => one(ctx, 0).sqrt(),
            MathNode::Log => one(ctx, 0).ln(),
            MathNode::Floor => one(ctx, 0).floor(),
            MathNode::Ceil => one(ctx, 0).ceil(),
            MathNode::Round => one(ctx, 0).round(),
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
mod text;

use self::text::{Concat, Length, Lowercase, Stringify, Text, Uppercase};
