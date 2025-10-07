window.addEventListener("message", async event => {
    if (!event?.data) return
    const container = document.getElementById("transcription")
    if (event.data.type === "MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION") {
        try {
            if (!event.data.annotationPage) return
            const response = await fetch(event.data.annotationPage, { cache: "no-store" })
            if (!response.ok) throw new Error("Failed to fetch annotations")
            const annotations = await response.json()
            if (!annotations?.items?.length) {
                container.innerHTML = `<div class="empty">No transcription available.</div>`
                return
            }

            const items = await Promise.all(
                annotations.items.map(async anno => {
                    if (!anno?.id) return ""
                    try {
                        const res = await fetch(anno.id)
                        if (!res.ok) return ""
                        const item = await res.json()
                        return item?.body?.value || item?.body?.[0]?.value || ""
                    } catch (err) {
                        return ""
                    }
                })
            )

            container.innerHTML = ""
            
            const copyContainer = document.createElement("div")
            copyContainer.className = "copy-icon-container"

            const copyIcon = document.createElement("img")
            copyIcon.className = "copy-icon"
            copyIcon.src = "./assets/copy.png"
            copyIcon.alt = "Copy Icon"

            copyContainer.appendChild(copyIcon)
            container.appendChild(copyContainer)
            copyContainer.addEventListener("click", () => {
                const textToCopy = items.map((item,index) => `${index + 1}. ${item}`).join("\n")
                const textArea = document.createElement("textarea")
                textArea.value = textToCopy
                document.body.appendChild(textArea)
                textArea.select()
                try {
                    document.execCommand('copy')
                } catch (err) {
                    console.error("Failed to copy transcription.")
                }
                document.body.removeChild(textArea)
                copyContainer.innerHTML = "<p class='copied-text'>✅ Copied</p>"
                setTimeout(() => {
                    copyContainer.innerHTML = ""
                    copyContainer.appendChild(copyIcon)
                }, 2000)
            })

            items.forEach((item,index) => {
                const div = document.createElement("div")
                div.className = "transcription-item"
                div.dataset.lineid = annotations.items[index]?.id || ""
                div.innerHTML = `<strong>${index + 1}.</strong><input type="text" value="${item}" class="transcription-input"/>`
                container.appendChild(div)
            })

            container.querySelectorAll(".transcription-input").forEach((input, index) => {
                input.addEventListener("input", (e) => {
                    const target = e.target
                    window.parent?.postMessage({ 
                        type: "UPDATE_LINE_TEXT", 
                        lineIndex: index, 
                        text: target.value 
                    }, "*")
                })
            })

            const first = container.querySelector(".transcription-item")
            if (first) first.classList.add("selected")
            container.querySelectorAll(".transcription-item").forEach((item, index) => {
                item.addEventListener("click", () => {
                    container.querySelectorAll(".transcription-item").forEach(i => i.classList.remove("selected"))
                    item.classList.add("selected")
                    window.parent?.postMessage({ 
                        type: "RETURN_LINE_ID", 
                        lineid: item.dataset.lineid || null, 
                        lineIndex: index 
                    }, "*")
                })
            })
        } catch (err) {
            console.error("Error processing annotations:", err)
        }
    }
    if (event.data.type === "SELECT_ANNOTATION") {
        const index = event.data.lineId
        if (typeof index !== "number") return
        const items = document.querySelectorAll(".transcription-item")
        const item = items[index]
        if (item) {
            items.forEach(i => i.classList.remove("selected"))
            item.classList.add("selected")
            item.scrollIntoView({ behavior: "smooth", block: "center" })
        }
    }
})
