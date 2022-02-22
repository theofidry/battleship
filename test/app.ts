let message_test: string = 'Hello, World!';
let message_checker: string = 'Hello World';

if (message_test != message_checker) {
    throw new Error();
}