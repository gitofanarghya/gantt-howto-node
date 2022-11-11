const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const Promise = require("bluebird");
require("date-format-lite");
var cors = require("cors");

const port = 1337;
const app = express();
const queryExecutor = require("./queryExecutor.js");
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
        `INSERT INTO org.activity_copy(name, start_date, duration_in_days, progress, project_ID) 
        VALUES ('${task.text}','${task.start_date}','${task.duration}','${task.progress}','${task.parent}')`
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
        `UPDATE org.activity_copy SET name='${task.text}',start_date='${task.start_date}',end_date='${task.end_date}',duration_in_days='${task.duration}',progress='${task.progress}',project_ID='${task.parent}'
        where activity_ID='${activityid}'
        `
      ),
      //db.query("SELECT * FROM gantt_links")
    ]);

    // Promise.all([
    //   db.query(
    //     "UPDATE gantt_tasks SET text = ?, start_date = ?, duration = ?, progress = ?, parent = ? WHERE id = ?",
    //     [
    //       task.text,
    //       task.start_date,
    //       task.duration,
    //       task.progress,
    //       task.parent,
    //       sid,
    //     ]
    //   ),
    //   updateOrder(sid, target),
    // ])
    //   .then((result) => {
    //     sendResponse(res, "updated");
    //   })
    //   .catch((error) => {
    //     sendResponse(res, "error", null, error);
    //   });
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

  // add link
  app.post("/data/link", (req, res) => {
    let link = getLink(req.body);

    db.query("INSERT INTO gantt_links(source, target, type) VALUES (?,?,?)", [
      link.source,
      link.target,
      link.type,
    ])
      .then((result) => {
        sendResponse(res, "inserted", result.insertId);
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // update link
  app.put("/data/link/:id", (req, res) => {
    let sid = req.params.id,
      link = getLink(req.body);

    db.query(
      "UPDATE gantt_links SET source = ?, target = ?, type = ? WHERE id = ?",
      [link.source, link.target, link.type, sid]
    )
      .then((result) => {
        sendResponse(res, "updated");
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  // delete link
  app.delete("/data/link/:id", (req, res) => {
    let sid = req.params.id;
    db.query("DELETE FROM gantt_links WHERE id = ?", [sid])
      .then((result) => {
        sendResponse(res, "deleted");
      })
      .catch((error) => {
        sendResponse(res, "error", null, error);
      });
  });

  function getTask(data) {
    return {
      text: data.text,
      start_date: data.start_date.date("YYYY-MM-DD"),
      end_date: data.end_date.date("YYYY-MM-DD"),
      duration: data.duration,
      progress: data.progress || 0,
      parent: data.parent,
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
