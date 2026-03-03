# Tutorial: Crear y hostear una Privacy Policy con GitHub Pages

## Paso 1 — Crear el archivo HTML

Crear un archivo `privacy-policy.html` en la raiz del repositorio con el contenido de la politica de privacidad. Debe incluir como minimo:

- Que datos recopila la app
- Como se usan esos datos
- Donde se almacenan (y seguridad)
- Si se comparten con terceros
- Servicios de terceros utilizados (Supabase, Expo, etc.)
- Derechos del usuario (acceso, modificacion, eliminacion)
- Email de contacto

> Google Play y App Store requieren que esta informacion sea accesible publicamente.

---

## Paso 2 — Push al repositorio

```bash
git add privacy-policy.html
git commit -m "Agregar politica de privacidad"
git push origin main
```

---

## Paso 3 — Activar GitHub Pages

1. Ir al repositorio en GitHub (`github.com/tu-usuario/tu-repo`)
2. **Settings** (pestana superior)
3. En el menu lateral izquierdo → **Pages**
4. En **Source** seleccionar:
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. Click en **Save**

---

## Paso 4 — Esperar el deploy

- GitHub tarda entre 1 y 3 minutos en hacer el primer deploy
- Se puede ver el estado en **Settings → Pages**, ahi va a aparecer la URL cuando este listo
- Tambien se puede ir a la pestana **Actions** del repo para ver el workflow de deploy

---

## Paso 5 — Verificar la URL

La URL tiene el formato:

```
https://<usuario>.github.io/<nombre-repo>/privacy-policy.html
```

Ejemplo:

```
https://joaquingonzalez32.github.io/FinanzasApp/privacy-policy.html
```

Abrir esa URL en el navegador y confirmar que se ve la pagina correctamente.

---

## Paso 6 — Configurar la URL en el proyecto

En `app.json`, agregar o actualizar el campo `privacyPolicyUrl`:

```json
"privacyPolicyUrl": "https://joaquingonzalez32.github.io/FinanzasApp/privacy-policy.html"
```

Esta URL es la que Google Play y App Store van a usar como enlace a la politica de privacidad.

---

## Troubleshooting

| Problema | Solucion |
|---|---|
| 404 despues de activar Pages | Esperar 2-3 minutos, GitHub tarda en el primer deploy |
| Sigue en 404 | Verificar que el archivo se haya pusheado (`git log --oneline` para confirmar) |
| URL no coincide | Chequear que el nombre del repo y el usuario sean exactos (es case-sensitive) |
| Pagina no se actualiza | GitHub cachea agresivamente — esperar unos minutos o hacer hard refresh (Ctrl+Shift+R) |
