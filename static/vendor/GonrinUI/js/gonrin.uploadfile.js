(function($){
    $.fn.uploadfile = function(options){
      defaults = {
          url: false,
          Authorization: false,
          item_template: false,
          width:false,
          item_template: false,
          show_progess: true,
          upload: function(){},
          draw_item:function(){},
          item_in_scroll: false
      };
        
        var file_list = new Array();
        var element = $(this);
        var item_template;
        var txt_uploaded;
        var template;
        var list_item;
        var totalupload=0;
        var item_height;
        var scroll_view;
        var url;
           defaults.upload = function(file,plink,progess,status){
                var http = new XMLHttpRequest();
                var fd       = new FormData();
           
                fd.append('image', file);
                http.open('POST', url);
                http.setRequestHeader('Authorization',Authorization); //Get yout Client ID here: http://api.imgur.com/
                http.upload.addEventListener('progress', function(evt){
                  //console.log ('Uploadding...');
                    //plink.html('Uploadding...');
                  if(evt.lengthComputable){
                    var percent = evt.loaded/evt.total;
                    percent = parseInt(percent*100);
                   // console.log(percent);
                    progess.attr('value',percent);
                    if(percent == 100)
                    {
                        plink.html("Upload 100%");
                    }
                  }
                },false);
                http.addEventListener('error',function(){
                    
                    console.log("Upload error!");
                },false);

                http.onreadystatechange = function () {
                    if (http.status === 200){
                        
                        if( http.readyState === 4) {
                       // $('.btn-item').attr("src","images/complete.png");
                       var res = JSON.parse(http.responseText), link, p, t;
                      // console.log(res);
                        link = res.data.link;
                        plink.html('');
                        plink.html(link);
                        status.show();
                        progess.hide();
                        totalupload=totalupload+1;
                        txt_uploaded.val(totalupload+" file uploaded");
                       // console.log("Total: "+totalupload);                 

                    }
                    } 
                    else
                        {
                            status.addClass('glyphicon glyphicon-exclamation-sign');
                            status.show();
                            plink.html("Upload Error!");
                            progess.val(50);
                        }
                   
                };
              
                http.send(fd);
             
                   
                      
                   
        };
        
        ////////////
        defaults.draw_item=function( file){              
                   // alert("draw-item");                
            var template = $('<div class="list-group-item" id="gonrin-upload-file-control-item"></div>');            
            template.append('<img class="gonrin-file-upload-item-image" src="#"/>');
           
            template.append('<div class="gonrin-file-upload-item-content"><p id="file-name"></p><p id="file-path"> Fiel Path </p></div>');
            template.append('<div class="gonrin-upload-file-item-btn"><span class="glyphicon glyphicon-ok-circle"></span><span class="glyphicon glyphicon-remove-circle" id="remove-item"></span></div>');               
            template.append('<progress class="gonrin-upload-file-item-progess" value="0" max="100"></progress>');    
            list_item.append(template);
            image = $(template).find('img');
            filename=$(template).find('#file-name');
            filepath= $(template).find('#file-path');
            filestatus = $(template).find(".glyphicon-ok-circle");            
            removefile = $(template).find("#remove-item");
            
            progess = $(template).find('.gonrin-upload-file-item-progess');
            
            removefile.click(function(){
                
                $(this).parent().parent().remove();
            });              
            
            filestatus.css('display','none');
            //progess.css('display','none');
            filename.html(file.name);
            
            if(file.type=='image/jpeg'||file.type =="image/png")
                {
                    draw_image(file,image);
                }
            else
                {
                   image.attr('src','images/document.png');
                }
           
            defaults.upload(file,filepath,progess,filestatus);
                    
        };
        
        /////////////////////////////////////////////
        var settings = $.extend(defaults, options);
       
        
        
        if(!defaults.url)
        url = "https://api.imgur.com/3/image";
        else
        url = options.url;
        var Authorization ;
        if(!defaults.Authorization)
            Authorization = "Client-ID ee4a3ba23904db0";
        else 
            Authorization = options.Authorization;
        //console.log(element);
       
        __init();
        add_events();
        //methods
         function __init(){
            template = $('<div class="container" id="upload-file-control-container"></div>');
            var bar = $('<div id="gonrin-upload-file-control-bar"></div>').append('  <input type="button" id="gonrin-upload-file-control-btn-select" class="btn btn-primary" value="Select Files">');
            bar.append(' <input type="file" id="gonrin-upload-file-select" style="display:none;" multiple>');
            bar.append('<input type="text" placeholder="No file selected..." class="form-control" id="gonrin-upload-file-control-select-file" readonly>');
            bar.append(' <span id="gonrin-upload-file-show-file-list" class="glyphicon glyphicon-chevron-down"></span>');
             list_item = $('<div class="list-group" id="gonrin-upload-file-control-list"></div>').css('display','none');            
             //
             item_template = $('<div class="list-group-item" id="gonrin-upload-file-control-item"></div>');
             item_template.append('<img class="gonrin-file-upload-item-image" src="#"/>');
             item_template.append('<div class="gonrin-file-upload-item-content"><p id="file-name"> File Name</p><p id="file-path"> Fiel Path </p></div>');
             item_template.append('<div class="gonrin-upload-file-item-btn"><span class="glyphicon glyphicon-ok-circle"></span><span class="glyphicon glyphicon-remove-circle"></span></div>');         
             item_template.append('<progress class="gonrin-upload-file-item-progess" value="0" max="100"></progress>');                      
             template.append(bar);             
             txt_uploaded=template.find('#gonrin-upload-file-control-select-file');             
             template.append(list_item); 
             element.append(template); 
             // set size
             if(defaults.width)
                 template.css("width",options.width);
    };
        /*function set_file_list(files){
          for (i=0; i<files.length; i++)
              file_list.push(files[i]);
            
        };
        function get_file_list(){
            return file_list;
        };
        
        function draw_list(list){
           
        };
        */
     
        
        
        //hien thi image tu file       
        function draw_image(input, selector_img){
                            
                            var reader = new FileReader();
                            reader.onload = function(e){
                                 $(selector_img).attr('src', e.target.result);

                            }
                            reader.readAsDataURL(input);                   
                            
                        };
        
        //Events
        function add_events(){
            var btn_select = element.find('#gonrin-upload-file-control-btn-select');
            var btn_file = $('#gonrin-upload-file-select');
            var btn_show_list = $('#gonrin-upload-file-show-file-list');
            btn_select.click(function(){
                $("#gonrin-upload-file-select").click();
            });
            //select file
            btn_file.change(function(){
                var files = btn_file[0].files;
                for(i=0;i<files.length; i++)
                   {
                       
                       {
                           defaults.draw_item(files[i]);
                          
                           
                          // defaults.upload(files[i]);
                       }
                    txt_uploaded.val(totalupload+" Files Uploaded");
                     
                   }
                
            });
     
          
           //show list
            btn_show_list.click(function(){
                if(list_item.children().length>0){
                if(list_item.css('display')=='none')
                {
                    list_item.show('slow');
                    $(this).removeClass('glyphicon glyphicon-chevron-down');
                    $(this).addClass('glyphicon glyphicon-chevron-up');
                    
                }
                else
                {
                    list_item.hide('slow'); 
                      $(this).removeClass('glyphicon glyphicon-chevron-up');
                    $(this).addClass('glyphicon glyphicon-chevron-down');
                }
                    }
            });
          
        };
        return this;
    };
    
    
  /*  //Object
    function file_item(){
        var file, status, link;
        //getter, setter
        this.set_file = function(file){
            this.file = file;
        }
        
        this.set_status = function(status){
            this.status = status;
        }
        
        this.set_link = function(link){
            this.link = link;
        }
        
        this.get_file = function(){
            return this.file;
        }
        this.get_status = function(){
            return this.status;
        }
        this.get_link = function(){
            return this.status;
        }
        //-------//        
    
    };
*/
    

    
}(jQuery));