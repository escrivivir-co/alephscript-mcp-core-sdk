
echo "Arrancha el servidor admin: -p 3009"
cd socket.io-admin-ui-develop/ui/dist

start http://localhost:3009
echo "Por url: introduce 'http://localhost:3010', sin credenciales"

http-server -p 3009 

