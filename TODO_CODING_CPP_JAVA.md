# TODO: Add C++ and Java Support to Coding Round

## Overview

The coding round currently supports JavaScript and Python. We need to extend it to support C++ and Java as well. The frontend already includes these languages in the dropdown, but the backend needs implementation.

## Tasks

- [x] Update language validation in `a/backend/routes/coding.js` to include 'cpp' and 'java'
- [x] Add `executeCpp` function to compile and run C++ code
- [x] Add `executeJava` function to compile and run Java code
- [x] Update the execution logic to call the appropriate function based on language
- [x] Update frontend to provide language-specific starter code templates
- [x] Update frontend overview to include C++
- [x] Test the implementation with sample C++ and Java code (disk space issue resolved by using custom temp directory)
- [x] Handle compilation errors and provide user-friendly messages
- [x] Ensure compilers (g++ for C++, javac for Java) are available or provide installation instructions

## Implementation Details

- For C++: Compile with `g++`, run the executable with input as command line argument
- For Java: Compile with `javac`, run with `java` and input as argument
- The code should be a complete program that parses the input string, computes the result, and prints JSON output
- Input format: The test case input (e.g., "[2,7,11,15], 9") is passed as a single string argument
- Output format: JSON string that can be parsed

## Example C++ Code Structure

```cpp
#include <bits/stdc++.h>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // user's code
}

int main(int argc, char* argv[]) {
    string input = argv[1];
    // parse input: "[2,7,11,15], 9"
    // extract nums and target
    // call twoSum
    // cout << JSON result
}
```

## Example Java Code Structure

```java
import java.util.*;

public class Main {
    public int[] twoSum(int[] nums, int target) {
        // user's code
    }

    public static void main(String[] args) {
        String input = args[0];
        // parse input
        // call twoSum
        // print JSON result
    }
}
```

## Testing

- Test with the existing Two Sum problem
- Verify compilation and execution work correctly
- Check error handling for compilation failures
- Ensure output parsing works for JSON output
