cd web-app
npm install
npm run build
cp -r build/* ../src/main/resources/static/

cd ..
mvn clean install -DskipTests
