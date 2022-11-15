const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const Promise = require("bluebird");
require("date-format-lite");
var cors = require("cors");

const port = 1337;
const app = express();
const queryExecutor = require("./queryExecutor.js");
const { send } = require("express/lib/response.js");
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.listen(port, () => {
  console.log("Server is running on port " + port + "...");
});
async function serverСonfig() {
  app.get("/task/:projectId", (req, res) => {
    const { projectId } = req.params;
    Promise.all([
      queryExecutor.executeQuery(
        `SELECT * FROM org.activity_copy where project_ID='${projectId}' ORDER BY sequence ASC`
      ),
      //db.query("SELECT * FROM gantt_links")
    ])
      .then((results) => {
        let tasks = results[0];
        //links = results[1];

        for (let i = 0; i < tasks.length; i++) {
          tasks[i].start_date = tasks[i].start_date.format(
            "YYYY-MM-DD hh:mm:ss"
          );
          tasks[i].open = true;
        }

        res.send({
          tasks,
          //collections: { links: links }
        });
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // add new task
  app.post("/task/create", (req, res) => {
    console.log(req);
    // adds new task to database
    let task = getTask(req.body);
    console.log(task);

    const result = Promise.all([
      queryExecutor.executeQuery(
        `INSERT INTO org.activity_copy(name, start_date, duration_in_days, progress, project_ID,parent) 
        VALUES ('${task.text}','${task.start_date}','${task.duration}','${task.progress}','${task.project_ID}','${task.parent}')`
      ),
      //db.query("SELECT * FROM gantt_links")
    ]);

    // db.query("SELECT MAX(sortorder) AS maxOrder FROM gantt_tasks")
    //   .then((result) => {
    //     /*!*/ // assign max sort order to new task
    //     let orderIndex = (result[0].maxOrder || 0) + 1;
    //     return db.query(
    //       "INSERT INTO gantt_tasks(text, start_date, duration, progress, parent, sortorder) VALUES (?,?,?,?,?,?)",
    //       [
    //         task.text,
    //         task.start_date,
    //         task.duration,
    //         task.progress,
    //         task.parent,
    //         orderIndex,
    //       ]
    //     );
    //   })
    //   .then((result) => {
    //     sendResponse(res, "inserted", result.insertId);
    //   })
    //   .catch((error) => {
    //     sendResponse(res, "error", null, error);
    //   });
    res.send(result);
  });

  // update task
  app.put("/task/update/:activityid", (req, res) => {
    let { activityid } = req.params,
      target = req.body.target,
      task = getTask(req.body);

    const result = Promise.all([
      queryExecutor.executeQuery(
        `UPDATE org.activity_copy SET name='${task.text}',start_date='${task.start_date}',end_date='${task.end_date}',duration_in_days='${task.duration}',progress='${task.progress}',project_ID='${task.project_ID},parent:'${task.parent}'
         where activity_ID='${activityid}'`
      ),
    ]);

    res.send(req.body);
  });

  function updateOrder(taskId, target) {
    let nextTask = false;
    let targetOrder;

    target = target || "";

    if (target.startsWith("next:")) {
      target = target.substr("next:".length);
      nextTask = true;
    }

    return db
      .query("SELECT * FROM gantt_tasks WHERE id = ?", [target])
      .then((result) => {
        if (!result[0]) return Promise.resolve();

        targetOrder = result[0].sortorder;
        if (nextTask) targetOrder++;

        return db
          .query(
            "UPDATE gantt_tasks SET sortorder = sortorder + 1 WHERE sortorder >= ?",
            [targetOrder]
          )
          .then((result) => {
            return db.query(
              "UPDATE gantt_tasks SET sortorder = ? WHERE id = ?",
              [targetOrder, taskId]
            );
          });
      });
  }

  // delete task
  app.delete("/task/delete/:activityId", (req, res) => {
    console.log(req);
    const { activityId } = req.params;
    const result = Promise.all([
      queryExecutor.executeQuery(
        `DELETE FROM org.activity_copy where activity_Id='${activityId}'`
      ),
    ]);
    // db.query("DELETE FROM gantt_tasks WHERE id = ?", [sid])
    //   .then((result) => {
    //     sendResponse(res, "deleted");
    //   })
    //   .catch((error) => {
    //     sendResponse(res, "error", null, error);
    //   });
    res.send(`successfully deleted ${activityId}`);
  });

  //get Link Type Api
  app.get("/linktype", (req, res) => {
    Promise.all([
      queryExecutor.executeQuery(
        `select link_type_ID,type,name from org.activity_links_type order by link_type_ID asc`
      ),
      //db.query("SELECT * FROM gantt_links")
    ])
      .then((results) => {
        let linktype = results[0];
        //links = results[1];

        res.send({
          linktype,
          //collections: { links: links }
        });
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  //get link
  app.get("/tasklink", (req, res) => {
    Promise.all([
      queryExecutor.executeQuery(
        `SELECT activity_links_ID,source,target,type FROM org.activity_links  ORDER BY id ASC`
      ),
      //db.query("SELECT * FROM gantt_links")
    ])
      .then((results) => {
        let link = results[0];
        //links = results[1];

        res.send({
          link,
          //collections: { links: links }
        });
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // add link
  app.post("/addlink", (req, res) => {
    let link = getLink(req.body);

    const result = Promise.all([
      queryExecutor.executeQuery(
        `INSERT INTO org.activity_links(source,target,type) 
        VALUES ('${link.source}','${link.target}','${link.type}')`
      ),
      //db.query("SELECT * FROM gantt_links")
    ]);

    res.send(result);
  });

  // update link
  app.put("/updatelink/:activitylinkID", (req, res) => {
    let { activitylinkID } = req.params;
    let { type } = req.body;

    console.log(activitylinkID, type);

    const result = Promise.all([
      queryExecutor.executeQuery(
        `UPDATE org.activity_links SET type='${type}'
        where activity_links_ID='${activitylinkID}'
        `
      ),
      //db.query("SELECT * FROM gantt_links")
    ]);
    console.log(result);

    res.send(result);
  });

  // delete link
  app.delete("/deletelink/:activitylinkID", (req, res) => {
    let { activitylinkID } = req.params;
    const result = Promise.all([
      queryExecutor.executeQuery(
        `DELETE FROM org.activity_links WHERE activity_links_ID ='${activitylinkID}'`
      ),
      //db.query("SELECT * FROM gantt_links")
    ]);

    res.send("deleted");
  });

  function getTask(data) {
    return {
      text: data.text,
      start_date: data.start_date.date("YYYY-MM-DD"),
      end_date: data.end_date.date("YYYY-MM-DD"),
      duration: data.duration,
      progress: data.progress || 0,
      parent: data.parent,
      project_ID: data.project_ID,
    };
  }

  function getLink(data) {
    return {
      source: data.source,
      target: data.target,
      type: data.type,
    };
  }

  function sendResponse(res, action, tid, error) {
    if (action == "error") console.log(error);

    let result = {
      action: action,
    };
    if (tid !== undefined && tid !== null) result.tid = tid;

    res.send(result);
  }
}
serverСonfig();
