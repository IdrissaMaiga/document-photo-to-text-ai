# Sample Ruby file for testing code extraction

class Calculator
  def initialize
    @operations = []
  end

  def add(a, b)
    result = a + b
    @operations << "#{a} + #{b} = #{result}"
    result
  end

  def multiply(a, b)
    result = a * b
    @operations << "#{a} * #{b} = #{result}"
    result
  end

  def get_history
    @operations.join("\n")
  end
end

# Usage
calc = Calculator.new
calc.add(5, 3)
calc.multiply(4, 2)
puts calc.get_history