# Plunja.js

Plunja is a simple JavaScript templating system that takes blocks of HTML
stored in `<script>` tags and renders them with context objects. It was
inspired by [Jinja2][1].

You don't need a JavaScript framework to use it, as you can define your own
custom locator (ie: a way of finding the template from the DOM). The built-in
locator uses jQuery, but it's really simple to define your own.

## Usage

You can use it with jQuery out-of-the-box, by including jQuery and the
plunja.js file.

### Initialising Plunja.js

Start by creating a template registry which you'll then use to locate and
render your templates.

```javascript
<script>
  $(document).ready(
    function() {
      var templates = new TemplateRegistry();
    }
  );
</script>
```

If you want to use Plunja.js without jQuery, or you have a better method for
locating templates, you'll need to define your own locator, like so:

```javascript
<script>
  var templates = new TemplateRegistry(
    {
      locator: function(name, callback) {
          callback(document.getElementById('template-' + name).innerHTML);
      }
    }
  );
</script>
```

You can define your own filters, to go with the couple of sample ones already
bundled in:

```javascript
<script>
  var templates = new TemplateRegistry(
    {
      filters: {
        reversed: function(value) {
          var ret = '';
          for(var i = 0; i < value.length; i ++) {
            ret = value[i] + ret;
          }
          return ret;
        }
      }
    }
  );
</script>
```

### Defining templates

By default, templates are stored in `<script>` tags, with a `data-template`
attribute used to identify the template by name.

```html
<script type="text/html" data-template="mytemplate">
  This is some text. This is a {{ var }}.
</script>
```

### Rendering the template

Templates are rendered asynchronously. You can pass variables into the
template, which can be accessed using the `{{ varname }}` notation depicted
above.

```javascript
<script>
  $(document).ready(
    function() {
      templates.get('mytemplate').on('render',
        function(html) {
          // Populate the div on the page with content from the rendered template
          $('div').html(html);
        }
      ).render(
        {
          var: 'variable'
        }
      );
    }
  );
</script>
```

A shortcut to the same end, without jQuery:

```javascript
<script>
  // Render the template to a div with an ID of 'mainDiv'
  templates.get('mytemplate').renderTo(
    document.getElementById('mainDiv'),
    {
      var: 'variable'
    }
  );
</script>
```

Replace `renderTo` with `appendTo` to append content to the element, rather
than replacing the HTML of the element.

### Asynchronicity (not a real word)

Because everything is asynchronous, you can define a template locator that
uses AJAX. Your locator function needs to accept two arguments: a string
containing the template name, and a callback argument.

When obtaining a template from an AJAX request, you simply call the supplied
callback function, passing in the contents of the template, or `false` if the
template couldn't be found.

### The registry and events

Templates are stored as objects and placed inside a registry, so each time you
access the same template, you're accessing a single object instance per
template.

Call `templates.get()` with the name of the template, and you'll get a
`Template` object back. Call `template.on('render', function(html) {... })` to
attach to the `render` method if you want to perform any dynamic actions once
rendering has taken place.

   [1]: http://jinja.pocoo.org/docs/
