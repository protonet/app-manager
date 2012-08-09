App Manager RabbitMQ-based RPC
==============================

Abilities
---------
The RPC system can be used for:

* Initiating app installations.
* Subscribing for, and checking up on, the status of app installations.
* Booting and killing apps.
* Listing apps and their status.
* Deleting apps from the system.
* Configuring apps that use the provided config system.

This documentation is not yet completed.

Overview
--------
App Manager binds to the `app-manager` queue on the `rpc` exchange and chills
there, waiting for JSON-based requests. Each request is expected to have the
following basic structure:

* `queue`: Name of the queue to publish any response to.
* `method`: Name of the function to call.
* `params`: Object, array, or other valid JSON value, to be passed directly to
    the method.

When a return value is generated by the function, the following keys are merged
onto the request object, which is then broadcasted to the specified response
queue:

* `error`: If `null`, no error occured. Otherwise, contains an error object from
    NodeJS saying that something went wrong. No defined structure yet.
* `result`: The return value from the function.

You can use any other keys for your own needs, such as supplying context or
sequence numbers so that the response handlers can know what it's dealing with.

Methods
-------

### install

* `uri`: URI to fetch the application from (git://, http://, user@host:repo.git)
* `id`: Optional id for the application, which is used for the filesystem, URLs,
    and various other things. Must be unique for all apps. If not specified, a
    unique id will be extracted from the URI.
* `buildpack`: Optional URI to fetch a buildpack from. For advanced users only;
    should not be needed normally.
* `callback`: Optional flag to subscribe to updates. If true, then responses to
    this RPC call continue to fire as the app install procedes, until the install
    finally completes or fails.

Begins the installation of an app. Response structure:

* `state`: String identifying the current state of the application.
* `name`: Pretty name that the application identifies itself as, if known.
* `message`: A message that can be appended to some sort of log. Used when
    continuous callbacks of the installation status is requested.

### list

* `id`: Optional partial filter for the id field.
* `name`: Optional partial filter for the name field.
* `desc`: Optional partial filter for the description field.
* `state`: Optional filter for the state field (i.e. `"running"`).

Returns an *array* of apps that exist on the system. Specifying no arguments will
return every known app. Filters on multiple fields will be treated as an AND.

Objects in the response contain at least `id`, `name`, `desc`, `source`,
`baseuri`, and `state`.

### show

* `id`: The id of the app to get info on.

Return an object with at least `id`, `name`, `desc`, `source`, `baseuri`,
`state`, `config`, `buildpack`, and `installedAt`.

### setState

* `id`: The id of the app to change the state of.
* `state`: The desired state. Valid values:

    * `running` starts the app if it isn't running.
    * `stopped` stops the app if it is running.
    * `disabled` stops the app if it is running, and marks it to not start again
      until setState is used to renable it (by changing the state to any other
      value).

Requests a state change of an app. Returns simply the current state of the app.
Multiple responses may be returned until the target state is reached (for
example, a running app may initially cause a `"stopping"` response, then a
`"stopped"` response in the future).