# Plugin script

Make sure to cover:

How to access server options

How to access plugin options (and mention that all options are optional and not validated at all. Types might not necessarily match what is specified in the manifest, and options could be undefined. No guarantees.)

Both onStart and onRequest are optional

hat you can do with server, and examples of modifying it

How to throw errors

How preventDefault works 

What you can do with res and req, and common examples such as getting the request path, setting headers, getting cookies, and editing page content

Add a few example scripts for common use cases:
- Adding a custom header
- Creating a 301/302 redirect from one directory to another, preserving query parameters
- Creating a _rewrite_ from one directory to another
- Modifying the contents of the returned file if it's an html file, such as injecting a script tag
- Requiring http authentication for only a specific directory or file