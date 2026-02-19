module.exports = {

    apps: [

        {

            name: "trainup-backend",



            // Make relative paths predictable (important for your cert paths)

            cwd: "/home/node97/code/trainUp/backend",



            // Your compiled server entry (based on: node ./dist/src/server.js)

            script: "dist/src/server.js",



            // Avoid "spawn node ENOENT"

            interpreter: "/usr/bin/node",



            instances: 1,

            exec_mode: "fork",

            autorestart: true,

            max_restarts: 10,



            // Load production env vars from your file

            env_file: ".envprod",



            // Optional: still keep NODE_ENV explicit

            env: {

                NODE_ENV: "production"

            }

        }

    ]

};