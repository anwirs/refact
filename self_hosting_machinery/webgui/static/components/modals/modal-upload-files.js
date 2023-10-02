export async function init(
    insert_in_el,
    open_on_click_el,
    modal_label,
    default_tab,
    submit_link_endpoint,
    submit_input_endpoint,
    text_on_progress_done,
    link_placeholder,
    input_help_text
) {
    let req = await fetch('/components/modals/modal-upload-files.html');
    insert_in_el.innerHTML = await req.text();
    insert_in_el.querySelector('#upload-modal-label').innerHTML = modal_label;

    if (default_tab === 'link') {
        insert_in_el.querySelector('#nav-upload-files-tab-link').classList.add('active', 'main-active')
        insert_in_el.querySelector('#tab-upload-files-link-div').classList.add('show', 'active')
    } else if (default_tab === 'input') {
        insert_in_el.querySelector('#nav-upload-files-tab-input').classList.add('active','main-active')
        insert_in_el.querySelector('#tab-upload-files-input-div').classList.add('show', 'active')
    } else {
        console.log(`default tab ${default_tab} is not implemented!`);
    }
    if (link_placeholder) {
        insert_in_el.querySelector('#upload-files-link').placeholder = link_placeholder;
    }
    if (input_help_text) {
        insert_in_el.querySelector('.ssh-info').innerHTML = input_help_text;
    }

    const modal_events = new UploadFilesModalEvents(
        submit_link_endpoint,
        submit_input_endpoint,
        text_on_progress_done
    );

    open_on_click_el.addEventListener('click', () => {
        modal_events.show_modal();
    });
}

class UploadFilesModalEvents {
    constructor(
        submit_link_endpoint,
        submit_input_endpoint,
        text_on_progress_done,
    ) {
        this.file_modal = document.getElementById('modal-upload-files');

        this.nav_btn_click_events();
        this.submit_event(submit_link_endpoint, submit_input_endpoint, text_on_progress_done);
    }

    nav_btn_click_events() {
        const file_modal = this.file_modal;

        const btns_nav_upload_files = file_modal.querySelectorAll('button.nav-upload-files')
        const panes_upload_files = file_modal.querySelectorAll('.pane-upload-files-modal');
        btns_nav_upload_files.forEach(
            el => el.addEventListener('click', () => {
                if (!el.classList.contains('active')) {
                    btns_nav_upload_files.forEach(el => el.classList.remove('active', 'main-active'));
                    el.classList.add('active', 'main-active');
                    panes_upload_files.forEach(el => el.classList.remove('show', 'active'));
                    file_modal.querySelector(`#${el.dataset.toggle}`).classList.add('show', 'active')
                }
            })
        );
    }

    submit_event(submit_link_endpoint, submit_input_endpoint, text_on_progress_done) {
        const file_modal = this.file_modal;
        function get_upload_method() {
            const btns = file_modal.querySelectorAll('button.nav-upload-files')
            for (const btn of btns) {
                if (btn.classList.contains('active')) {
                    return btn.dataset.method;
                }
            }
        }

        const upload_files_submit = this.file_modal.querySelector('#upload-files-modal-submit')

        upload_files_submit.addEventListener('click', () => {
            const upload_method = get_upload_method();
            if (upload_method === 'link') {
                this.upload_url(submit_link_endpoint);
            }
            else if (upload_method === 'input') {
                this.upload_file(submit_input_endpoint, text_on_progress_done);
            } else {
                console.log(`upload method ${upload_method} is not implemented!`);
            }
        });
    }


    reset_modal_fields() {
        const file_modal = document.getElementById('modal-upload-files');

        file_modal.querySelector('#upload-files-input').value = '';
        file_modal.querySelector('#upload-files-modal-submit').disabled = false;
        file_modal.querySelector('#nav-upload-files-tab-link').disabled = false;
        file_modal.querySelector('#upload-files-link').disabled = false;
        file_modal.querySelector('#upload-files-input').disabled = false;
        file_modal.querySelector('#file-upload-progress-bar').setAttribute('aria-valuenow', '0');
        file_modal.querySelector('#file-upload-progress').classList.toggle('d-none');
        file_modal.querySelector('#upload-files-modal-submit').classList.remove('d-none');
        file_modal.querySelector('#loaded_n_total').innerHTML = "";
        file_modal.querySelector('#upload-files-status').innerHTML = "";
        file_modal.querySelector('#upload-files-link').value = "";
        file_modal.querySelector('#upload-files-100-spinner').hidden = true;
        file_modal.querySelector('#nav-upload-files-tab-input').disabled = false;
    }

    hide_modal() {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-upload-files')).hide();
    }

    show_modal() {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-upload-files')).show();
    }

    process_now_update_until_finished(upload_method) {
        const file_modal = document.getElementById('modal-upload-files');
        const process_button = file_modal.querySelector('#upload-files-modal-submit');
        process_button.disabled = true;
        process_button.dataset.loading = 'true';
        if (upload_method === 'link') {
            file_modal.querySelector('#nav-upload-files-tab-input').disabled = true;
            file_modal.querySelector('#upload-files-link').disabled = true;
            file_modal.querySelector('#upload-files-100-spinner').hidden = false;
            file_modal.querySelector('#upload-files-status').innerHTML = 'Uploading file. Please wait...'
        } else if (upload_method === 'input') {
            file_modal.querySelector('#nav-upload-files-tab-link').disabled = true;
            file_modal.querySelector('#upload-files-input').disabled = true;
        }
    }

    upload_file(endpoint, text_on_progress_done) {
        const file_modal = this.file_modal;
        const file_input = file_modal.querySelector('#upload-files-input');
        const file_upload_progress = file_modal.querySelector('#file-upload-progress');
        const progress_bar = file_modal.querySelector('#file-upload-progress-bar');
        const upload_files_status = file_modal.querySelector('#upload-files-status');
        // const modal_submit = file_modal.querySelector('#upload-files-modal-submit');

        const process_now_update_until_finished = this.process_now_update_until_finished;
        const hide_modal = this.hide_modal;
        const reset_modal_fields = this.reset_modal_fields;

        function progressHandler(event) {
            process_now_update_until_finished('input');
            file_modal.querySelector('#loaded_n_total').innerHTML = "Uploaded " + event.loaded + " bytes of " + event.total;
            let percent = (event.loaded / event.total) * 100;
            progress_bar.setAttribute('aria-valuenow', Math.round(percent).toString());
            progress_bar.style.width = Math.round(percent).toString() + "%";
            upload_files_status.innerHTML = Math.round(percent).toString() + "% uploaded... please wait";
            if (Math.round(percent) >= 100) {
                upload_files_status.innerHTML = text_on_progress_done;
                file_modal.querySelector('#upload-files-100-spinner').hidden = false;
            }
        }

        function completeHandler(event) {
            upload_files_status.innerHTML = event.target.responseText;

            if(event.target.status === 200) {
                setTimeout(() => {
                    reset_modal_fields();
                    hide_modal();
                }, 500);
            } else {
                let error_msg = JSON.parse(event.target.responseText);
                reset_modal_fields();
                upload_files_status.innerHTML = error_msg.message;
            }
        }

        function errorHandler(event) {
            upload_files_status.innerHTML = event.target.responseText.message;
        }

        function abortHandler() {
            upload_files_status.innerHTML = "Upload Aborted";
        }

        if (file_input.files.length === 0) {
            return;
        }
        let formdata = new FormData();
        formdata.append("file", file_input.files[0]);
        file_upload_progress.classList.toggle('d-none');
        // modal_submit.classList.toggle('d-none');
        let ajax = new XMLHttpRequest();
        ajax.upload.addEventListener("progress", progressHandler, false);
        ajax.addEventListener("load", completeHandler, false);
        ajax.addEventListener("error", errorHandler, false);
        ajax.addEventListener("abort", abortHandler, false);
        ajax.open("POST", endpoint);
        ajax.send(formdata);
    }

    upload_url(endpoint) {
        const file_modal = this.file_modal;

        function handle_invalid_url() {
            const error = new Error('Invalid URL');
            file_modal.querySelector('#status-url').innerHTML = error.message;
        }

        const file_input = file_modal.querySelector('#upload-files-link');
        if (!file_input || file_input.value === '') {
            return;
        }

        const url_regex = /^(ftp|http|https):\/\/[^ "]+$/;
        const is_url = url_regex.test(file_input.value);
        if (!is_url) {
            handle_invalid_url();
            return;
        }

        const formData = {
            'url': file_input.value
        };

        this.process_now_update_until_finished('link')
        fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).then(
            response => {
                if (!response.ok) {
                    return response.json()
                        .then(error => {
                            throw new Error(error.message);
                        });
                }
                this.reset_modal_fields();
                return response.json();
            }).then(
                data => {
                    this.reset_modal_fields();
                    this.hide_modal();
                    }).catch(
                        error => {
                        file_modal.querySelector('#upload-files-status').innerHTML = error.message;
                });
    }
}
