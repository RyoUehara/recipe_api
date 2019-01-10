var express = require('express');
var router = express.Router();

require('date-utils');
var mysql      = require('mysql');
var db_config = {
  host     : process.env.DATABASE_HOST,
  user     : process.env.DATABASE_USER,
  password : process.env.DATABASE_PASSWORD,
  database : process.env.DATABASE_NAME
};

var mysql = require('mysql');

var connection;

var get_SQL_Connection = function() {

  connection = mysql.createConnection(db_config);

  //接続時
  connection.connect(function(err) {
    if(err) {
      console.log("SQL CONNECT ERROR >> " + err);
      setTimeout(get_SQL_Connection, 2000);  //接続失敗時リトライ
    } else {
      console.log("SQL CONNECT SUCCESSFUL.");
    }
  });

  //エラーのとき
  connection.on('error', function(err) {
    console.log("SQL CONNECTION ERROR >> " + err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.log('=> RECONECT...');
      //再接続
      get_SQL_Connection();
    } else {
      throw err;
    }
  });

}
get_SQL_Connection();


/* recipes 
 * 全件取得を行う
 */
router.get('/', function(req, res, next) {
  var query = 'select id, title, making_time, serves, ingredients, cost from recipes';
  connection.query(query, function (error, results, fields) {
    if (error) throw error;
    var data = {"recipes": convertALLCostInRecipesToString(results)}
    res.send(data);
  });
});

/* recipes/:id
 * 1件取得を行う
 */
router.get('/:id', function(req, res, next) {
  var query = 'select title, making_time, serves, ingredients, cost from recipes where id = ?';
  connection.query(query,[req.params.id], function (error, results, fields) {
    if (error || results.length == 0) {
      var data = {"message": "Recipe details not found"}
      res.status(400).send(data);
    } else {
      var data = {"message": "Recipe details by id",
                "recipe": convertALLCostInRecipesToString(results)}
      res.send(data);
    }
  });
});

/* recipes
 * 追加を行う
 */
router.post('/', function(req, res, next) {
  var query = 'insert into recipes set ?';
  var request_data = {};
  var data = {};
  try {
    request_data = validate(req);
    request_data["created_at"] = new Date().toFormat('YYYY-MM-DD HH:MI:SS');
    request_data["updated_at"] = new Date().toFormat('YYYY-MM-DD HH:MI:SS');
  } catch (e) {
    console.log(e);
  }
  connection.query(query,request_data, function (error, insert_results, fields) {
    if (error) {
      data = {"message": "Recipe creation failed!",
              "required": "title, making_time, serves, ingredients, cost"
              };
      res.status(200).send(data);
    } else {
      var query = 'select title, making_time, serves, ingredients, cost from recipes where id = ?';
      connection.query(query,[insert_results.insertId], function (error, select_results, fields) {
        if (error) throw error;
        data = {"message": "Recipe successfully created!",
              "recipe": convertALLCostInRecipesToString(select_results)
            };
        res.send(data);
      });
    }
  });
});
/* recipes/:id
 * 更新を行う
 */
router.patch('/:id', function(req, res, next) {
  console.log(req.body);
  var query = 'update recipes set ? where id = ?';
  var request_data = {};
  var data = {};
  try {
    request_data = validate(req);
    request_data["updated_at"] = new Date().toFormat('YYYY-MM-DD HH:MI:SS');
  } catch (e) {
    console.log(e);
  }
  connection.query(query,[request_data, req.params.id], function (error, update_results, fields) {
    if (error) {
      data = {"message": "Recipe update failed!",
              "required": "title, making_time, serves, ingredients, cost"
              };
      res.status(400).send(data);
    } else if (update_results.affectedRows == 0) {
      data = {"message": "Recipe update target not Found"};
      res.status(400).send(data);
    } else {
      console.log(update_results);
      var query = 'select title, making_time, serves, ingredients, cost from recipes where id = ?';
      connection.query(query,[req.params.id], function (error, select_results, fields) {
        if (error) throw error;
        data = {"message": "Recipe successfully updated!",
              "recipe": convertALLCostInRecipesToString(select_results)
            };
        res.send(data);
      });
    }
  });
});

/* recipes/:id
 * 1件削除を行う
 */
router.delete('/:id', function(req, res, next) {
  var query = 'delete from recipes where id = ?'
  connection.query(query,[req.params.id], function (error, results, fields) {
    var data = {};
    if (error || results.affectedRows == 0){
      data = { "message":"No Recipe found" };
      res.status(400).send(data);
    } else {
      data = {  "message": "Recipe successfully removed!" };
      res.send(data);
    }
  });
});


/**
 * recipeにvalidateをかける
 * 長さだけ確認する、失敗したらそのデータは弾く、mysqlのinsertやupdateで弾かれるから問題ないはず
 * @param {*} req 
 */
function validate(req) {
  var data = {}
  if (Object.keys(req.body).length === 0 ){
    throw new Error("validate failed!");
  }
  Object.keys(req.body).forEach(function(key) {
    // costが数字でくるため文字列に変換した上で長さを確認、数値以外が来てたらmysqlでエラーになるから問題なし
    if( req.body[key].toString().length > 0 ) {
      data[key] = req.body[key];
    } else {
      throw new Error("validate failed!");
    }
  });
  return data;
}

/**
 * costの返す形を数値じゃなく文字列に変換するメソッド
 * 返すJSONデータが全て文字列のため
 */
function convertALLCostInRecipesToString(recipes_result_array) {
  recipes_result_array.forEach( function(recipe) {
    recipe.cost = recipe.cost.toString();
  });
  return recipes_result_array;
}

module.exports = router;