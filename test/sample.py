# Sample Python file for testing code extraction

def sample_function():
    """A sample function that returns a greeting."""
    print("This is a sample Python function")
    return "Hello, World!"

class SampleClass:
    """A sample class for testing purposes."""

    def __init__(self, name):
        self.name = name

    def greet(self):
        """Return a greeting message."""
        return f"Hello, {self.name}!"

# Main execution
if __name__ == "__main__":
    obj = SampleClass("Python")
    print(obj.greet())

# This file contains:
# - Functions with docstrings
# - Classes
# - String formatting
# - Main guard
# - Comments