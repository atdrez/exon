#include <stdio.h>
#include "greet.h"

void greet(const char *name) {
    printf("Hello, %s!\n", name);
}

void greet_with_title(const char *title, const char *name) {
    printf("Hello, %s %s!\n", title, name);
}
