module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }],
    ['@babel/preset-react', {
      runtime: 'automatic'
    }]
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }],
        ['@babel/preset-react', {
          runtime: 'automatic'
        }]
      ],
      plugins: [
        function() {
          return {
            visitor: {
              MetaProperty(path) {
                if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
                  path.replaceWithSourceString('globalThis.import.meta');
                }
              }
            }
          };
        }
      ]
    }
  }
};