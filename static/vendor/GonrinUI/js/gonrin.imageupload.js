(function($){
    $.fn.extend({        
       imageUpload : function(options){
           var defaults = {
              width: '',
              height: '',
              view_link: false,
              get_link:false,
              color: "#000000",
              Url: '',
              method:'POST',
              Authorization: 'Client-ID ee4a3ba23904db0',
              upload: function(file){}
           };
             var xhttp = new XMLHttpRequest();
             defaults.upload= function(file){
                   var self     = this,                   
                    fd       = new FormData();
                fd.append('image', file);
                xhttp.open('POST', defaults.Url);
                xhttp.setRequestHeader('Authorization', defaults.Authorization); //Get yout Client ID here: http://api.imgur.com/
                xhttp.upload.addEventListener('progress', function(evt){
                  console.log ('Uploadding...');
                  if(evt.lengthComputable){
                    var percent = evt.loaded/evt.total;
                    percent = parseInt(percent*100);
                    console.log(percent);
                    $('#progress').attr('value',percent);
                    if(percent == 100)
                    {
                      $("#cancle-upload").attr('src','images/complete.png');
                    }
                  }
                },false);
                xhttp.addEventListener('error',function(){
                    xhttp.abort();
                    console.log("Upload error!");
                },false);

                xhttp.onreadystatechange = function () {
                    if (xhttp.status === 200 && xhttp.readyState === 4) {
                       // $('.btn-item').attr("src","images/complete.png");
                       var res = JSON.parse(xhttp.responseText), link, p, t;
                       console.log(res);
                        link = res.data.link;                     
                          if(defaults.view_link == true)
                          {
                            $('#link').css('display','block');
                            $('#link-upload').attr('value',link);
                          }

                          $("#progress-upload").delay(300).hide('slow');

                    }
                };
                xhttp.send(fd)
           };
            var setting = $.extend(defaults, options);   
           ///////////////////////////////////////////////////////////////////////////////
                var Element = this;
                var file;
                var template = '<div id="img-upload"><img id="upload-button"   src="images/snapshot.png"><input type="file" id="file-upload" ><div id="progress-upload"><progress value="20" max="100" id="progress" text="Uploadding..."> </progress><img id="cancle-upload" src="images/delete.png"></div>  ';
           //Phuong thuc
                var methods = {
                            init : function(){
                            Element.append(template);
                            if(defaults.width != '')
                            {
                            console.log("width is: "+defaults.width);
                            Element.css('width',defaults.width);
                            
                                                          }
                    if(defaults.view_link == true){
                            $('#img-upload').append('<div id="link"> </div>');
                            $('#link').append('<input id="link-upload" type="text" value="">');
                            $('#link').append('<input id="hide-link" type="button" class="btn-primary btn-small" value="hide link">');
                          }
                            console.log(defaults.color);
                            console.log(defaults.Url);
            },    
                      readURL:  function (input, selector_img){
                            if(input.files && input.files[0]){
                            var reader = new FileReader();
                            reader.onload = function(e){
                                 $(selector_img).attr('src', e.target.result);

                            }
                            reader.readAsDataURL(input.files[0]);                   
                            }
                        }
            
           };
           
          
         
          
           methods.init();          
           
           /////////////////
                $('#upload-button').click(function(){           
                $('#file-upload').click();
            });
                $('#hide-link').click(function(){
                  status = $(this).attr('value');
                  if(status == 'hide link'){
                  $("#link-upload").hide();
                  $(this).attr('value','Show link');
                }
                else
                {
                  $("#link-upload").show();
                  $(this).attr('value','hide link');
                }
                 });
                $('#cancle-upload').click(function(){
                  xhttp.abort();
                });
            $('#file-upload').change(function(){
                files = $('#file-upload')[0].files;
                console.log(files);
                methods.readURL(this,'#upload-button');                
                $('#progress-upload').show();
                $('#progress').attr('value',0);

                console.log($('#file-upload')[0].files[0].name);
                
                defaults.upload(files[0]);
                $('#upload-button').css('opacity',1.0);
               
            });
        
           //////////////
       
        return this;
    }
 });
    
    
 
  
}(jQuery));