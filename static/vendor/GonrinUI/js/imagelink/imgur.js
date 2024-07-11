function Imgur() {
        var module = {
	    
            xhr: function () {
                return new XMLHttpRequest();
            },
            create: function (name, props) {
                var el = document.createElement(name), p;
                for (p in props) {
                    if (props.hasOwnProperty(p)) {
                        el[p] = props[p];
                    }
                }
                return el;
            },
            remove: function (els) {
                while (els.hasChildNodes()) {
                    els.removeChild(els.lastChild);
                }
            },
            bindEvent: function () {
		
                var fileinput = this.obj.find('#file_upload')[0],
                    fileName  = this.obj.find('#link')[0],
                    fileImage  = this.obj.find('#image')[0],
                    status    = this.obj.find('.status')[0],
                    self      = this;
		
                fileinput.addEventListener('change', function (e) {
                    var files = e.target.files, file, p, t, i, len;
                    for (i = 0, len = files.length; i < len; i += 1) {
                        file = files[i];
                        if (file.type.match(/image.*/)) {
                            self.remove(status);
                            //fileName.value = this.value;

                            p = self.create('p');
                            t = document.createTextNode("Uploading...");

                            p.appendChild(t);
                            status.appendChild(p);

                            self.upload(file);
                        } else {
                            self.remove(status);

                            p = self.create('p');
                            t = document.createTextNode("Invalid Archive");

                            p.appendChild(t);
                            status.appendChild(p);
                        }
                    }
                }, false);
            },
            upload: function (file) {
                var self     = this,
                    xhttp    = self.xhr(),
                    fileName  = this.obj.find('#link')[0],
                    fileImage  = this.obj.find('#image')[0],
                    status    = this.obj.find('.status')[0],
                    fd       = new FormData();

                fd.append('image', file);
                xhttp.open('POST', 'https://api.imgur.com/3/image');
                xhttp.setRequestHeader('Authorization', 'Client-ID ee4a3ba23904db0'); //Get yout Client ID here: http://api.imgur.com/
                xhttp.onreadystatechange = function () {
                    if (xhttp.status === 200 && xhttp.readyState === 4) {
                        var res = JSON.parse(xhttp.responseText), link, p, t;
                        self.remove(status);
                        link = res.data.link;
                        p    = self.create('p');
                        t    = document.createTextNode('Image uploaded!');
                        fileName.value = link;
                        if(fileImage){
                        	$(fileImage).attr("src",link);
                        };
                        p.appendChild(t);
                        status.appendChild(p);
                    }
                };
                xhttp.send(fd);
            },
            init: function (obj) {
		module.obj = $(obj);
                module.bindEvent();
            }
        };

        return module;
    }
