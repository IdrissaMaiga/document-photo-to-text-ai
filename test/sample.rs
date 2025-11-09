// Sample Rust file for testing code extraction
use std::collections::VecDeque;

struct Calculator {
    operations: Vec<String>,
}

impl Calculator {
    fn new() -> Self {
        Calculator {
            operations: Vec::new(),
        }
    }

    fn add(&mut self, a: i32, b: i32) -> i32 {
        let result = a + b;
        let operation = format!("{} + {} = {}", a, b, result);
        self.operations.push(operation);
        result
    }

    fn multiply(&mut self, a: i32, b: i32) -> i32 {
        let result = a * b;
        let operation = format!("{} * {} = {}", a, b, result);
        self.operations.push(operation);
        result
    }

    fn get_history(&self) -> String {
        self.operations.join("\n")
    }
}

fn main() {
    let mut calc = Calculator::new();
    calc.add(5, 3);
    calc.multiply(4, 2);
    println!("{}", calc.get_history());
}