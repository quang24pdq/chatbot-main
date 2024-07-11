# Overview
GonrinUI ComboBox control displays a list of values and allows for a single or multiple selection from that list.

The ComboBox supports for local and remote data binding, item templates and configurable options for controlling the list behavior.

# Getting Started
To initialize the ComboBox, use any of the following methods:
1. Bind the control to a local data array and use the \<input\> element
2. Bind the control to a remote data service and use the <input> element

### Bind to Local Data Arrays

```html
<script>
  gonrin.notify("message");
</script>
```

```html
<script>
	gonrin.notify({message: "ERROR"}, {type: "danger", z_index:1555});
</script>
```