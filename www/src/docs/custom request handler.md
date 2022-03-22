# Creating a custom request handler

This guide covers how to write a custom `httpRequest` handler script.


## Step 1: create the request

```
var request = new httpRequest()
```


## Step 2: Setup events

In this step, you can set any headers, the onload event, and the onerror event

Setting a header:
```
`request.setRequestHeader(headerType, headerValue)`
```
or
```
`request.setHeader(headerType, headerValue)`
```

Setting the load and error functions:
```
request.onload = function(e) {
    console.log(e.target.body.toString()) //This will log the response body
}
```
and
```
request.onerror = function(e) {
    console.error(e)
}
```


## Step 3: Open the request

In this step, the module will process the url and all information needed and then it will create the request. Headers can still be set after this step.

```
request.open("GET", url, allowInsecureResponse)
```
allowInsecureResponse: `true` or `false`. By default, self signed certificates are blocked. Enable by setting this to true.


## Step 4: send the request

In this step you can send data to the client
```
request.send(data)
```

If data is not defined, then nothing will be sent.
The content length is automatically set
data MUST be a string, buffer, or an ArrayBuffer



## Stream to a file

You can stream data straight to a file.

When Setting up the events, you can turn this option on by doing the following.

`request.setupStreamToFile(res, savePath)`

res MUST be defined as res. It is required to do some things with the file system
savePath is the path you want to save the file to. This will create missing folders

the onload request body will be a string saying `'The response was written to a file.'`

