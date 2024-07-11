define(function(require) {
	return class ObjectRefactor {
		constructor() {
			return "hello world";
		};
		
		getCorrectValueType(inputObject, schema) {
			if (!inputObject || !schema) {
				throw "ObjectRefactor class: Two arguments are required";
			}
			var keyNames = Object.keys(schema);
			keyNames.forEach(function(property) {
				if (schema[property].type == "string") {
					inputObject[property] = String(inputObject[property]);
				} else if (schema[property].type == "number") {
					inputObject[property] = parseInt(inputObject[property]);
				} else if (schema[property].type == "dict") {
					// TODO
				} else if (schema[property].type == "list") {
					// TODO
				}
			});
			return JSON.parse(JSON.stringify(inputObject));
		}
	}
});