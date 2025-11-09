// Sample C# file for testing code extraction
using System;
using System.Collections.Generic;

namespace CalculatorApp
{
    public class Calculator
    {
        private List<string> operations;

        public Calculator()
        {
            operations = new List<string>();
        }

        public int Add(int a, int b)
        {
            int result = a + b;
            string operation = $"{a} + {b} = {result}";
            operations.Add(operation);
            return result;
        }

        public int Multiply(int a, int b)
        {
            int result = a * b;
            string operation = $"{a} * {b} = {result}";
            operations.Add(operation);
            return result;
        }

        public string GetHistory()
        {
            return string.Join("\n", operations);
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            Calculator calc = new Calculator();
            calc.Add(5, 3);
            calc.Multiply(4, 2);
            Console.WriteLine(calc.GetHistory());
        }
    }
}