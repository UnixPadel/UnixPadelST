using System;
using MySqlConnector;

var cs = Environment.GetEnvironmentVariable("DBQ_CS");
using var conn = new MySqlConnection(cs);
conn.Open();
using var cmd = new MySqlCommand(args[0], conn);
using var r = cmd.ExecuteReader();
while (r.Read()) {
    var vals = new string[r.FieldCount];
    for (int i = 0; i < r.FieldCount; i++) vals[i] = r.GetValue(i)?.ToString();
    Console.WriteLine(string.Join(" | ", vals));
}

