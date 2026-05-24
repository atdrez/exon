#include <stdio.h>
#include "greet.h"
#include "math_utils.h"

int main(void) {
    greet("World");
    greet_with_title("Dr.", "Ada Lovelace");

    printf("2 + 3 = %d\n", add(2, 3));
    printf("4 * 5 = %d\n", multiply(4, 5));
    printf("5! = %d\n", factorial(5));

    return 0;
}
