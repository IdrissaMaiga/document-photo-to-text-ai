// Sample C++ file for testing code extraction
#include <iostream>
#include <vector>
#include <string>

class Calculator {
private:
    std::vector<std::string> operations;

public:
    Calculator() {}

    int add(int a, int b) {
        int result = a + b;
        operations.push_back(std::to_string(a) + " + " + std::to_string(b) + " = " + std::to_string(result));
        return result;
    }

    int multiply(int a, int b) {
        int result = a * b;
        operations.push_back(std::to_string(a) + " * " + std::to_string(b) + " = " + std::to_string(result));
        return result;
    }

    std::string getHistory() {
        std::string result;
        for (size_t i = 0; i < operations.size(); ++i) {
            if (i > 0) result += "\n";
            result += operations[i];
        }
        return result;
    }
};

int main() {
    Calculator calc;
    calc.add(5, 3);
    calc.multiply(4, 2);
    std::cout << calc.getHistory() << std::endl;
    return 0;
}