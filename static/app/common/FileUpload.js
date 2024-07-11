define(function (require) {
    "use strict";
    // {
    //     'url': '',
    //     'path': ''
    // }
    // callback: called after upload success
    function fileUpload(options, onProcess, onDone) {

        var uploadServiceURL = (options && options.url) ? options.url : 'https://devcrm.upgo.vn/api/v1/contact_import'
        if (options && options.path) {
            uploadServiceURL += '?path=' + options.path;
        }
        var hasLoader = false;
        if (loader) {
            hasLoader = true;
        }
        var upId = gonrin.uuid()
        $(`<form id="${upId}" style="width: 1px; height: 1px; overflow: hidden;">
            <input type="file" />
        </form>`).appendTo($('body')).fadeIn();
        setTimeout(function () {
            $('#' + upId).remove();
        }, 60000);
        $("#" + upId + " input").on('change', (event) => {
            var files = event.target.files;
            if (files && files.length > 0) {
                var file = files[0];
                var formData = new FormData();
                var regex = /.*\.(xlsx|xls|csv)/g
                if (file.name.match(regex)) {
                    formData.append("file", file);
                }

                var xmlHttp = new XMLHttpRequest();
                xmlHttp.open('POST', uploadServiceURL);
                xmlHttp.addEventListener('progress', function (e) {
                    // var done = e.position || e.loaded, total = e.totalSize || e.total;
                    // console.log('xhr progress: ' + (Math.floor(done / total * 1000) / 10) + '%');
                }, false);
                if (xmlHttp.upload) {
                    xmlHttp.upload.onprogress = function (e) {
                        var done = e.position || e.loaded, total = e.totalSize || e.total;
                        if (hasLoader) {
                            $('.preloader span').html((Math.floor(done / total * 100)) + "%");
                        }
                        if (onProcess) {
                            onProcess(e);
                        }
                    };
                }
                xmlHttp.onreadystatechange = function () {
                    if (hasLoader) {
                        loader.hide();
                        $('.preloader span').html('');
                        $("#" + upId).remove();
                        $('#' + upId).css({ 'width': '1px' }, { 'hegith': '1px' }, { 'overflow': 'hidden' });
                    }
                    if (xmlHttp.status === 200 && xmlHttp.readyState === 4) {
                        var imgobj = JSON.parse(xmlHttp.responseText);
                        if (onDone) {
                            onDone(imgobj);
                        }
                    }
                };
                xmlHttp.send(formData);
                if (hasLoader) {
                    loader.show();
                }
            }
        });
        $("#" + upId + " input").click();
    }
    return fileUpload;
});