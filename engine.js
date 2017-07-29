const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid/v4');

// https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
const walk = (dir, partOfFileName, eventEmitter, id, done) => {
    let files = [];
    let directories = [];
    fs.readdir(dir, (error, list) => {
        if (error) return done(error);
        let i = 0;
        const next = () => {
            let file = list[i++];
            if (!file) return done(null, files);
            file = path.join(dir, file);
            fs.stat(file, (err, stat) => {
                if (stat && stat.isDirectory()) {
                    eventEmitter.emit('directory', {id, directory: file});
                    walk(file, partOfFileName, eventEmitter, id, (err, res) => {
                        directories = directories.concat(res);
                        next();
                    });
                } else {
                    eventEmitter.emit('file', {id, file});
                    if (file.indexOf(partOfFileName) > -1) {
                        files.push(file);
                        eventEmitter.emit('match', {id, file});
                    }
                    next();
                }
            });
        };
        next();
    });
};

module.exports = (searchString, eventEmitter) => {
    const id = uuidv4();
    const p = path.join(__dirname, 'node_modules');
    walk(p, searchString, eventEmitter, id, (error, result) => eventEmitter.emit('done', {id, error, result}));
    return id;
};
