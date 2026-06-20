package com.rinana.media.user;

import com.rinana.media.common.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

class InMemoryUserRepository implements UserRepository {
  private final Map<UUID, UserEntity> users = new LinkedHashMap<>();

  @Override
  public Optional<UserEntity> findUserById(UUID id) {
    return Optional.ofNullable(users.get(id));
  }

  @Override
  public Optional<UserEntity> findByUsername(String username) {
    return users.values().stream()
      .filter(user -> user.getUsername().equals(username))
      .findFirst();
  }

  @Override
  public Optional<UserEntity> findByEmail(String email) {
    return users.values().stream()
      .filter(user -> user.getEmail().equals(email))
      .findFirst();
  }

  @Override
  public boolean existsByUsername(String username) {
    return findByUsername(username).isPresent();
  }

  @Override
  public boolean existsByEmail(String email) {
    return findByEmail(email).isPresent();
  }

  @Override
  public Optional<UserEntity> findByRole(Role role) {
    return users.values().stream()
      .filter(user -> user.getRole() == role)
      .findFirst();
  }

  @Override
  public long countByRole(Role role) {
    return users.values().stream()
      .filter(user -> user.getRole() == role)
      .count();
  }

  @Override
  public List<UserEntity> findAllUsers() {
    return users.values().stream()
      .sorted(Comparator.comparing(UserEntity::getCreatedAt).reversed())
      .toList();
  }

  @Override
  public Page<UserEntity> findManageableUsers(String query, Pageable pageable) {
    String normalizedQuery = query == null ? "" : query.toLowerCase();
    List<UserEntity> filteredUsers = users.values().stream()
      .filter(user -> user.getRole() != Role.SUPER_ADMIN)
      .filter(user -> normalizedQuery.isBlank() || matchesQuery(user, normalizedQuery))
      .sorted(Comparator.comparing(UserEntity::getCreatedAt).reversed())
      .toList();
    int start = (int) Math.min(pageable.getOffset(), filteredUsers.size());
    int end = Math.min(start + pageable.getPageSize(), filteredUsers.size());
    return new PageImpl<>(filteredUsers.subList(start, end), pageable, filteredUsers.size());
  }

  @Override
  public UserEntity saveUser(UserEntity user) {
    if (user.getId() == null) {
      user.setId(UUID.randomUUID());
    }
    users.put(user.getId(), user);
    return user;
  }

  private boolean matchesQuery(UserEntity user, String query) {
    return contains(user.getUsername(), query)
      || contains(user.getEmail(), query)
      || contains(user.getDisplayName(), query);
  }

  private boolean contains(String value, String query) {
    return value != null && value.toLowerCase().contains(query);
  }
}
