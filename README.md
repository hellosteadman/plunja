# Plunja.js demo

Plunja is a simple JavaScript templating system that takes blocks of HTML
stored in `<script>` tags and renders them with context objects. It was
inspired by [Jinja2][1].

You don't need a JavaScript framework to use it, as you can define your own
custom locator (ie: a way of finding the template from the DOM). The built-in
locator uses jQuery, but it's really simple to define your own.

Made by [Steadman][2]

### Basic template

    <p>Hello. This is a basic template. You can click the button below to copy me as much as you like.</p>

Duplicate the text above

### Context variables

    <p>The current time is <strong>{{ time }}</strong>.</p>

Duplicate the text above

### Filters

    <p>The current weekday is <strong>{{ weekday|uppercase }}</strong>.</p>

Duplicate the text above

### Usage

You can use it with jQuery out-of-the-box, by including jQuery and the
plunja.js file.

You start by creating a template registry which you'll then use to locate and
render your templates.

    <script>
      $(document).ready(
        function() {
          var templates = new TemplateRegistry();
        }
      );
    </script>

If you want to use Plunja.js without jQuery, or you have a better method for
locating templates, you'll need to define your own locator, like so:

    <script>
      var templates = new TemplateRegistry(
        {
          locator: function(name) {
              return document.getElementById('template-' + name).innerHTML;
          }
        }
      );
    </script>

You can define your own filters, to go with the couple of sample ones already
bundled in:

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

   [1]: http://jinja.pocoo.org/docs/
   [2]: http://steadman.io/