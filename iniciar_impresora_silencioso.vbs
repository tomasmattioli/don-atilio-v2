Set WshShell = CreateObject("WScript.Shell")
' Obtener el directorio donde reside este script .vbs
strCurDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' Ejecutar iniciar_impresora.bat de forma completamente oculta (ventana 0 = invisible)
WshShell.Run """" & strCurDir & "\iniciar_impresora.bat""", 0, False
