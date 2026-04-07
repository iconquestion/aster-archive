// get a json response from given url and attrs. used to do simple interaction.
window.get_json_response = function get_json_response(
  trigger_ele_id,
  response_show_ele_id,
  fetch_url,
  fetch_attrs = {}
) {
  document
    .getElementById(trigger_ele_id)
    .addEventListener('click', async () => {
      let response_show_ele = document.getElementById(response_show_ele_id);
      response_show_ele.innerText = '';

      await fetch(fetch_url, fetch_attrs)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          console.log(data);
          if (!data || !data.message) throw new Error('Invalid response.');

          response_show_ele.innerText = data.message;
        })
        .catch((err) => {
          const err_summary =
            "Sorry but we've encountered an issue. Please try again later.";
          response_show_ele.innerText = err_summary;
          console.log(err_summary);
          console.error(err);
        });
    });
};
