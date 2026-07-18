Documentation of COMMITTEE PAGE'S CODE:
+++ Everything is dynamically updated using algorithm


To update the top page's background: simply change the file and keeping the file's name in the path BANNER_CMT_FULL/banner.webp (!! must be .webp !!)


To update the committee's pictures AND division's name or add/remove any divisions:
!! ONLY NEED TO MODIFY THE FOLDER'S CONTENTS !!

Folder Paths:   /CMT_Assets/DIVISION_NAME/MEMBER_NUMBER     DIVISION IMAGES (INDIVIDUAL)
                /BANNER_CMT_FULL/Full/DIVISION_NAME         DIVISION IMAGES (TEAM)
*DIVISION_NAME Must be in the following format: "{abbr. of the division} {actual division name}"; eg: "BPH Badan Pengurus Harian"*
*MEMBERS' PICTURES MUST BE IN .webp       **!NO OTHER FORMAT IS ALLOWED!***


The website will automatically count the number of divisions (folders that exist in CMT_Assets) and dynamically update every details in the website itself. It will also automatically count the number of members in each divisions (files that exist in CMT_Assets/DIVISION_NAME) and choose the proper layout to be displayed.

**NO CODE SHALL BE CHANGED UNLESS NEEDED TO**
