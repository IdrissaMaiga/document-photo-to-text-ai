<?php
// Sample PHP file for testing code extraction

class Calculator {
    private $operations;

    public function __construct() {
        $this->operations = array();
    }

    public function add($a, $b) {
        $result = $a + $b;
        $operation = $a . " + " . $b . " = " . $result;
        array_push($this->operations, $operation);
        return $result;
    }

    public function multiply($a, $b) {
        $result = $a * $b;
        $operation = $a . " * " . $b . " = " . $result;
        array_push($this->operations, $operation);
        return $result;
    }

    public function getHistory() {
        return implode("\n", $this->operations);
    }
}

// Usage
$calc = new Calculator();
$calc->add(5, 3);
$calc->multiply(4, 2);
echo $calc->getHistory() . "\n";
?>