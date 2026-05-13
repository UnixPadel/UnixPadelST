namespace CrmModern.Core.Exceptions;

/// <summary>Thrown when a requested entity does not exist → HTTP 404.</summary>
public sealed class NotFoundException(string entityName, object key)
    : Exception($"'{entityName}' with key '{key}' was not found.");
