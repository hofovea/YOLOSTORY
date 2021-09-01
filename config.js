const cloudinary = {
    api_key: 169297226221666,
    api_secret: "B0M_PRKSjByW4_gesqnHOsh7wS0",
    cloud_name: "hofoveacloud"
};
module.exports = {
    DatabaseUrl: process.env["DATABASE_URL"] || 'mongodb://localhost:27017/yolostory2',
    Serverport:  process.env["PORT"] || 3000,
    cloudinary,
    secret: "u_never_know"
};
