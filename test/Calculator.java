// Sample Java file for testing code extraction
public class Calculator {
    private List<String> operations;

    public Calculator() {
        this.operations = new ArrayList<>();
    }

    public int add(int a, int b) {
        int result = a + b;
        operations.add(a + " + " + b + " = " + result);
        return result;
    }

    public int multiply(int a, int b) {
        int result = a * b;
        operations.add(a + " * " + b + " = " + result);
        return result;
    }

    public String getHistory() {
        return String.join("\n", operations);
    }

    public static void main(String[] args) {
        Calculator calc = new Calculator();
        calc.add(5, 3);
        calc.multiply(4, 2);
        System.out.println(calc.getHistory());
    }
}