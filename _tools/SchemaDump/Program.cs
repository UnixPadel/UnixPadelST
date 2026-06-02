using System.Text;
using MySqlConnector;

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: SchemaDump <connStr> <outputFile>");
    return 1;
}

string connStr = args[0];
string outFile = args[1];

var sb = new StringBuilder();
sb.AppendLine("# DB Schema Snapshot");
sb.AppendLine();
sb.AppendLine($"_Generated: {DateTime.UtcNow:O}_");
sb.AppendLine();

try
{
    await using var conn = new MySqlConnection(connStr);
    await conn.OpenAsync();
    sb.AppendLine($"**Connection:** OK — Server `{conn.DataSource}`, Database `{conn.Database}`, ServerVersion `{conn.ServerVersion}`.");
    sb.AppendLine();

    var tables = new List<(string Name, long? Rows)>();
    await using (var cmd = new MySqlCommand(
        "SELECT TABLE_NAME, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME", conn))
    await using (var rd = await cmd.ExecuteReaderAsync())
    {
        while (await rd.ReadAsync())
            tables.Add((rd.GetString(0), rd.IsDBNull(1) ? null : rd.GetInt64(1)));
    }

    sb.AppendLine($"## Tablolar ({tables.Count})");
    sb.AppendLine();
    sb.AppendLine("| Tablo | Yaklaşık Satır |");
    sb.AppendLine("|---|---:|");
    foreach (var t in tables)
        sb.AppendLine($"| `{t.Name}` | {(t.Rows?.ToString() ?? "?")} |");
    sb.AppendLine();

    sb.AppendLine("## Kolon Detayları");
    sb.AppendLine();
    foreach (var t in tables)
    {
        sb.AppendLine($"### `{t.Name}`");
        sb.AppendLine();
        sb.AppendLine("| Kolon | Tip | Null | Key | Default | Extra |");
        sb.AppendLine("|---|---|---|---|---|---|");
        await using var cmd = new MySqlCommand(
            "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME=@t ORDER BY ORDINAL_POSITION", conn);
        cmd.Parameters.AddWithValue("@t", t.Name);
        await using var rd = await cmd.ExecuteReaderAsync();
        while (await rd.ReadAsync())
        {
            string col = rd.GetString(0);
            string type = rd.GetString(1);
            string nul = rd.GetString(2);
            string key = rd.GetString(3);
            string def = rd.IsDBNull(4) ? "" : rd.GetString(4);
            string ext = rd.IsDBNull(5) ? "" : rd.GetString(5);
            sb.AppendLine($"| `{col}` | `{type}` | {nul} | {key} | {def} | {ext} |");
        }
        sb.AppendLine();
    }

    sb.AppendLine("## Foreign Keys");
    sb.AppendLine();
    sb.AppendLine("| Tablo | Kolon | -> | Ref Tablo | Ref Kolon | Constraint |");
    sb.AppendLine("|---|---|---|---|---|---|");
    await using (var cmd = new MySqlCommand(
        "SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, COLUMN_NAME", conn))
    await using (var rd = await cmd.ExecuteReaderAsync())
    {
        while (await rd.ReadAsync())
            sb.AppendLine($"| `{rd.GetString(0)}` | `{rd.GetString(1)}` | -> | `{rd.GetString(2)}` | `{rd.GetString(3)}` | `{rd.GetString(4)}` |");
    }
    sb.AppendLine();

    sb.AppendLine("## Indexler");
    sb.AppendLine();
    sb.AppendLine("| Tablo | Index | Unique | Kolon(lar) |");
    sb.AppendLine("|---|---|---|---|");
    await using (var cmd = new MySqlCommand(
        "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME", conn))
    await using (var rd = await cmd.ExecuteReaderAsync())
    {
        while (await rd.ReadAsync())
            sb.AppendLine($"| `{rd.GetString(0)}` | `{rd.GetString(1)}` | {(rd.GetInt64(2) == 0 ? "YES" : "no")} | `{rd.GetString(3)}` |");
    }

    await File.WriteAllTextAsync(outFile, sb.ToString());
    Console.WriteLine($"OK: {tables.Count} tables -> {outFile}");
    return 0;
}
catch (Exception ex)
{
    sb.AppendLine($"**Connection:** FAILED — {ex.GetType().Name}: {ex.Message}");
    await File.WriteAllTextAsync(outFile, sb.ToString());
    Console.Error.WriteLine($"ERROR: {ex.Message}");
    return 2;
}
