
===============
Getting Started
===============


= Installation =
=========

----------
Yarn
----------

.. code-block:: javascript

    yarn add sensible-sdk
    

------------------------------------------------------------------------------


----------
npm
----------

.. code-block:: javascript
    
    npm install --save sensible-sdk
    
------------------------------------------------------------------------------


--------------
Browser bundle
--------------

.. code-block:: javascript

    <script src="https://unpkg.com/sensible-sdk@latest/dist/sensible.browser.min.js"></script>
    


= Usage =
=========

----------
Javascript
----------

.. code-block:: javascript

    const sensible = require("sensible-sdk");
    console.log(sensible)
    

------------------------------------------------------------------------------

.. _glossary-json-interface:

----------
ES6
----------

.. code-block:: javascript

    import * as sensible from "sensible-sdk";
    console.log(sensible)
    

------------------------------------------------------------------------------


----------
Browser bundle
----------

.. code-block:: javascript

   // `sensible` is provided in the global namespace by the `sensible.browser.min.js` script bundle.
    console.log(sensible)
    

That's it! now you can use the ``sensible`` object.
