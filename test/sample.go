// Sample Go file for testing code extraction
package main

import (
	"fmt"
	"strconv"
	"strings"
)

type Calculator struct {
	operations []string
}

func NewCalculator() *Calculator {
	return &Calculator{
		operations: make([]string, 0),
	}
}

func (c *Calculator) Add(a, b int) int {
	result := a + b
	operation := strconv.Itoa(a) + " + " + strconv.Itoa(b) + " = " + strconv.Itoa(result)
	c.operations = append(c.operations, operation)
	return result
}

func (c *Calculator) Multiply(a, b int) int {
	result := a * b
	operation := strconv.Itoa(a) + " * " + strconv.Itoa(b) + " = " + strconv.Itoa(result)
	c.operations = append(c.operations, operation)
	return result
}

func (c *Calculator) GetHistory() string {
	return strings.Join(c.operations, "\n")
}

func main() {
	calc := NewCalculator()
	calc.Add(5, 3)
	calc.Multiply(4, 2)
	fmt.Println(calc.GetHistory())
}